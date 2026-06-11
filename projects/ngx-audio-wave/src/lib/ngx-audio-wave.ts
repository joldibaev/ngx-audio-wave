import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  effect,
  inject,
  input,
  numberAttribute,
  OnDestroy,
  PLATFORM_ID,
  SecurityContext,
  signal,
  viewChild,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Subscription } from 'rxjs';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { filterAudioBufferData, normalizeAudioData } from './waveform.utils';

let nextGradientId = 0;

@Component({
  selector: 'ngx-audio-wave',
  templateUrl: './ngx-audio-wave.html',
  styleUrls: ['./ngx-audio-wave.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NgxAudioWave implements OnDestroy {
  // required inputs
  readonly audioSrc = input.required<string | SafeUrl>();

  // optional inputs
  readonly color = input('#1e90ff');
  readonly height = input(25, { transform: numberAttribute });
  readonly gap = input(5, { transform: numberAttribute });
  readonly rounded = input(true, { transform: booleanAttribute });
  readonly hideBtn = input(false, { transform: booleanAttribute });
  readonly skip = input(5, { transform: numberAttribute });
  readonly volume = input(1, { transform: numberAttribute });
  readonly playbackRate = input(1, { transform: numberAttribute });
  readonly loop = input(false, { transform: booleanAttribute });
  readonly samples = input(50, { transform: numberAttribute });

  // accessibility inputs
  readonly ariaLabel = input<string>('');
  readonly playButtonLabel = input('Play audio');
  readonly pauseButtonLabel = input('Pause audio');
  readonly progressBarLabel = input('Audio progress bar');

  // public state signals
  readonly isPaused = signal(true);
  readonly isLoading = signal(true);
  readonly hasError = signal(false);
  readonly currentVolume = signal(1);
  readonly currentPlaybackRate = signal(1);
  readonly isLooping = signal(false);
  readonly progressText = computed(() => {
    const current = this.exactCurrentTime();
    const duration = this.exactDuration();
    const percent = this.exactPlayedPercent();

    if (duration === 0) {
      return 'Audio not loaded';
    }

    const currentMinutes = Math.floor(current / 60);
    const currentSeconds = Math.floor(current % 60);
    const durationMinutes = Math.floor(duration / 60);
    const durationSeconds = Math.floor(duration % 60);

    return `${currentMinutes}:${currentSeconds.toString().padStart(2, '0')} of ${durationMinutes}:${durationSeconds.toString().padStart(2, '0')} (${Math.round(percent)}% played)`;
  });
  readonly statusText = computed(() => {
    if (this.isLoading()) {
      return 'Loading audio';
    }

    if (this.hasError()) {
      return 'Error loading audio';
    }

    if (this.isPaused()) {
      return 'Audio paused';
    }

    return 'Audio playing';
  });

  // public-exact
  readonly exactPlayedPercent = computed(() => {
    const percent = this.calculatePercent(
      this.exactDuration(),
      this.exactCurrentTime()
    );
    return percent < 100 ? percent : 100;
  });
  readonly exactCurrentTime = signal(0);
  readonly exactDuration = signal(0);

  // injecting
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isPlatformBrowser = isPlatformBrowser(this.platformId);
  private readonly domSanitizer = inject(DomSanitizer);
  private readonly httpClient = inject(HttpClient);

  // component internal signals
  protected readonly gradientId = `ngx-audio-wave-gradient-${nextGradientId++}`;
  protected readonly audioElementSrc = computed(
    () => this.sanitizeAudioSrc(this.audioSrc()) ?? ''
  );
  protected readonly normalizedData = signal<number[]>([]);
  protected readonly isHovering = signal(false);
  protected readonly hoverOffset = signal(0);
  protected readonly progressOffset = computed(
    () => `${this.exactPlayedPercent()}%`
  );
  protected readonly visualHeight = computed(() => Math.max(1, this.height()));
  protected readonly visualGap = computed(() => Math.max(1, this.gap()));
  protected readonly visualSamples = computed(() =>
    Math.max(1, Math.floor(this.samples()))
  );
  protected readonly width = computed(
    () => this.visualSamples() * this.visualGap()
  );

  // view
  private audioRef = viewChild<ElementRef<HTMLAudioElement>>('audioRef');
  private audioFetchSubscription?: Subscription;
  private audioLoadId = 0;
  private animationFrameId: number | null = null;
  private lastNonZeroVolume = 1;

  constructor() {
    effect(() => {
      if (!this.isPlatformBrowser || !this.audioRef()) {
        return;
      }

      this.fetchAudio(this.audioSrc(), this.visualSamples());
    });

    effect(() => {
      const volume = this.clampVolume(this.volume());
      const playbackRate = this.clampPlaybackRate(this.playbackRate());
      const loop = this.loop();

      this.currentVolume.set(volume);
      this.currentPlaybackRate.set(playbackRate);
      this.isLooping.set(loop);

      if (volume > 0) {
        this.lastNonZeroVolume = volume;
      }

      const audio = this.getAudioElement();
      if (!this.isPlatformBrowser || !audio) {
        return;
      }

      audio.volume = volume;
      audio.playbackRate = playbackRate;
      audio.loop = loop;
    });
  }

  ngOnDestroy() {
    this.audioFetchSubscription?.unsubscribe();
    this.stopCurrentTimeSync();
    this.stop();
  }

  // playback control
  play(time?: number) {
    if (!this.isPlatformBrowser) return;

    const audio = this.getAudioElement();
    if (!audio) return;

    if (!this.audioElementSrc()) {
      this.hasError.set(true);
      return;
    }

    if (time !== undefined) {
      this.seekTo(time);
    }

    void audio.play().catch(error => {
      if (error instanceof DOMException && error.name === 'NotSupportedError') {
        this.hasError.set(true);
        return;
      }

      console.error(error);
    });
  }

  pause() {
    if (!this.isPlatformBrowser) return;

    const audio = this.getAudioElement();
    if (!audio) return;

    audio.pause();
  }

  stop() {
    if (!this.isPlatformBrowser) return;

    const audio = this.getAudioElement();
    if (!audio) return;

    audio.currentTime = 0;
    this.pause();
  }

  setVolume(volume: number) {
    if (!this.isPlatformBrowser) return;

    const audio = this.getAudioElement();
    if (!audio) return;

    const clampedVolume = this.clampVolume(volume);
    audio.volume = clampedVolume;
    this.currentVolume.set(clampedVolume);
    if (clampedVolume > 0) {
      this.lastNonZeroVolume = clampedVolume;
    }
  }

  /** @deprecated Use setVolume(0) instead. */
  mute() {
    this.setVolume(0);
  }

  /** @deprecated Use setVolume(previousNonZeroVolume) with your own stored value instead. */
  unmute() {
    this.setVolume(this.lastNonZeroVolume);
  }

  /** @deprecated Use setVolume(currentVolume() === 0 ? value : 0) instead. */
  toggleMute() {
    if (this.currentVolume() === 0) {
      this.unmute();
    } else {
      this.mute();
    }
  }

  setPlaybackRate(rate: number) {
    if (!this.isPlatformBrowser) return;

    const audio = this.getAudioElement();
    if (!audio) return;

    const clampedRate = this.clampPlaybackRate(rate);
    audio.playbackRate = clampedRate;
    this.currentPlaybackRate.set(clampedRate);
  }

  /** @deprecated Use setPlaybackRate(1) instead. */
  resetPlaybackRate() {
    this.setPlaybackRate(1);
  }

  /** @deprecated Use setPlaybackRate(currentPlaybackRate() + 0.25) instead. */
  increasePlaybackRate() {
    const currentRate = this.currentPlaybackRate();
    const newRate = Math.min(4, currentRate + 0.25);
    this.setPlaybackRate(newRate);
  }

  /** @deprecated Use setPlaybackRate(currentPlaybackRate() - 0.25) instead. */
  decreasePlaybackRate() {
    const currentRate = this.currentPlaybackRate();
    const newRate = Math.max(0.25, currentRate - 0.25);
    this.setPlaybackRate(newRate);
  }

  setLoop(loop: boolean) {
    if (!this.isPlatformBrowser) return;

    const audio = this.getAudioElement();
    if (!audio) return;

    audio.loop = loop;
    this.isLooping.set(loop);
  }

  /** @deprecated Use setLoop(true) instead. */
  enableLoop() {
    this.setLoop(true);
  }

  /** @deprecated Use setLoop(false) instead. */
  disableLoop() {
    this.setLoop(false);
  }

  /** @deprecated Use setLoop(!isLooping()) instead. */
  toggleLoop() {
    this.setLoop(!this.isLooping());
  }

  // user interaction
  setTime(mouseEvent: MouseEvent) {
    const pointer = this.getPointerPosition(mouseEvent);
    const clickPercent = this.calculatePercent(pointer.width, pointer.offset);

    const time = (clickPercent * this.exactDuration()) / 100;

    this.seekTo(time);
  }

  protected setHoverPosition(mouseEvent: MouseEvent) {
    this.isHovering.set(true);
    this.hoverOffset.set(this.getPointerPosition(mouseEvent).offset);
  }

  protected clearHoverPosition() {
    this.isHovering.set(false);
  }

  // private helpers
  private calculatePercent(total: number, value: number) {
    if (total <= 0) {
      return 0;
    }

    const percent = (value / total) * 100;
    return Number.isFinite(percent) ? percent : 0;
  }

  private clampVolume(volume: number) {
    return Math.max(0, Math.min(1, volume));
  }

  private clampPlaybackRate(rate: number) {
    return Math.max(0.25, Math.min(4, rate));
  }

  private getPointerPosition(event: MouseEvent) {
    const target = event.currentTarget;
    if (!(target instanceof HTMLElement)) {
      return { offset: 0, width: this.width() };
    }

    const rect = target.getBoundingClientRect();
    return {
      offset: Math.max(0, Math.min(rect.width, event.clientX - rect.left)),
      width: rect.width,
    };
  }

  private clampTime(time: number) {
    const duration = this.exactDuration();
    if (!Number.isFinite(time)) {
      return 0;
    }

    return Math.max(0, duration > 0 ? Math.min(duration, time) : time);
  }

  private seekTo(time: number) {
    const audio = this.getAudioElement();
    if (!audio) return;

    const clampedTime = this.clampTime(time);
    audio.currentTime = clampedTime;
    this.exactCurrentTime.set(clampedTime);
  }

  private updateCurrentTime() {
    const audio = this.getAudioElement();
    if (!audio) return;

    this.exactCurrentTime.set(audio.currentTime);
  }

  private getAudioElement() {
    return this.audioRef()?.nativeElement ?? null;
  }

  private startCurrentTimeSync() {
    if (this.animationFrameId !== null) {
      return;
    }

    const sync = () => {
      this.updateCurrentTime();
      if (!this.isPaused()) {
        this.animationFrameId = requestAnimationFrame(sync);
      } else {
        this.animationFrameId = null;
      }
    };

    this.animationFrameId = requestAnimationFrame(sync);
  }

  private stopCurrentTimeSync() {
    if (this.animationFrameId === null) {
      return;
    }

    cancelAnimationFrame(this.animationFrameId);
    this.animationFrameId = null;
  }

  private fetchAudio(audioSrc: string | SafeUrl, samples: number) {
    this.audioFetchSubscription?.unsubscribe();
    const loadId = ++this.audioLoadId;
    this.isLoading.set(true);
    this.hasError.set(false);
    this.exactDuration.set(0);
    this.exactCurrentTime.set(0);
    this.normalizedData.set([]);

    const src = this.sanitizeAudioSrc(audioSrc);
    if (!src) {
      console.error('Invalid SafeUrl: could not sanitize');
      this.hasError.set(true);
      this.isLoading.set(false);
      return;
    }

    this.audioFetchSubscription = this.httpClient
      .get(src, { responseType: 'arraybuffer' })
      .subscribe({
        next: arrayBuffer => {
          void this.decodeAudio(arrayBuffer, samples, loadId);
        },
        error: error => {
          if (loadId === this.audioLoadId) {
            console.error(error);
            this.hasError.set(true);
            this.isLoading.set(false);
          }
        },
      });
  }

  private async decodeAudio(
    arrayBuffer: ArrayBuffer,
    samples: number,
    loadId: number
  ) {
    let audioContext: AudioContext | null = null;

    try {
      audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      if (loadId !== this.audioLoadId) {
        return;
      }

      this.exactDuration.set(audioBuffer.duration);

      const filteredData = filterAudioBufferData(audioBuffer, samples);
      this.normalizedData.set(normalizeAudioData(filteredData));
    } catch (error) {
      if (loadId === this.audioLoadId) {
        console.error(error);
        this.hasError.set(true);
      }
    } finally {
      if (audioContext) {
        await audioContext.close();
      }

      if (loadId === this.audioLoadId) {
        this.isLoading.set(false);
      }
    }
  }

  private sanitizeAudioSrc(audioSrc: string | SafeUrl) {
    return typeof audioSrc === 'object'
      ? this.domSanitizer.sanitize(SecurityContext.URL, audioSrc)
      : audioSrc;
  }

  protected pauseChange(event: Event) {
    if (!(event.target instanceof HTMLAudioElement)) return;
    this.isPaused.set(event.target.paused);
    if (event.target.paused) {
      this.stopCurrentTimeSync();
      this.updateCurrentTime();
    } else {
      this.startCurrentTimeSync();
    }
  }

  protected durationChange(event: Event) {
    if (!(event.target instanceof HTMLAudioElement)) return;

    const duration = event.target.duration;
    if (Number.isFinite(duration) && duration > 0) {
      this.exactDuration.set(duration);
    }
  }

  protected timeChange(event: Event) {
    if (!(event.target instanceof HTMLAudioElement)) return;

    this.exactCurrentTime.set(event.target.currentTime);
  }

  // event handlers
  protected onKeyDown(event: KeyboardEvent) {
    if (!this.isPlatformBrowser) return;

    const audio = this.getAudioElement();
    if (!audio) return;

    const duration = this.exactDuration();

    switch (event.key) {
      case ' ':
      case 'Enter':
        event.preventDefault();
        if (this.isPaused()) {
          this.play();
        } else {
          this.pause();
        }
        break;

      case 'ArrowLeft':
        event.preventDefault();
        const leftTime = Math.max(0, audio.currentTime - this.skip());
        this.seekTo(leftTime);
        break;

      case 'ArrowRight':
        event.preventDefault();
        const rightTime = Math.min(duration, audio.currentTime + this.skip());
        this.seekTo(rightTime);
        break;

      case 'Home':
        event.preventDefault();
        this.seekTo(0);
        break;

      case 'End':
        event.preventDefault();
        this.seekTo(duration);
        break;
    }
  }
}
