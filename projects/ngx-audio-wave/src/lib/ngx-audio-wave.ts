import {
  AfterViewInit,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
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
import { finalize, interval } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { NgxAudioWaveService } from './service/ngx-audio-wave.service';

@Component({
  selector: 'ngx-audio-wave',
  templateUrl: './ngx-audio-wave.html',
  styleUrls: ['./ngx-audio-wave.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [NgxAudioWaveService],
})
export class NgxAudioWave implements AfterViewInit, OnDestroy {
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

  // deprecated signals
  /** @deprecated This property will be removed in version 21.0.0. Use exactPlayedPercent instead. */
  readonly playedPercent = computed(() =>
    Math.round(this.exactPlayedPercent())
  );
  /** @deprecated This property will be removed in version 21.0.0. Use exactCurrentTime instead. */
  readonly currentTime = computed(() => Math.round(this.exactCurrentTime()));
  /** @deprecated This property will be removed in version 21.0.0. Use exactDuration instead. */
  readonly duration = computed(() => Math.round(this.exactDuration()));

  // component internal signals
  protected readonly normalizedData = signal<number[]>([]);
  protected readonly clipPath = computed(
    () => `inset(0px ${100 - this.exactPlayedPercent()}% 0px 0px)`
  );
  protected readonly width = computed(
    () => this.audioWaveService.samples * this.gap()
  );

  // injecting
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isPlatformBrowser = isPlatformBrowser(this.platformId);
  private readonly domSanitizer = inject(DomSanitizer);
  private readonly httpClient = inject(HttpClient);
  private readonly audioWaveService = inject(NgxAudioWaveService);
  private readonly destroyRef = inject(DestroyRef);

  // view
  private audioRef =
    viewChild.required<ElementRef<HTMLAudioElement>>('audioRef');

  // lifecycle hooks
  ngAfterViewInit() {
    if (this.isPlatformBrowser) {
      this.fetchAudio(this.audioSrc());
      this.setVolume(this.volume());
      this.setPlaybackRate(this.playbackRate());
      this.setLoop(this.loop());

      this.startInterval();
    }
  }

  ngOnDestroy() {
    this.stop();
  }

  // playback control
  play(time = 0) {
    if (!this.isPlatformBrowser) return;

    const audio = this.audioRef().nativeElement;
    void audio.play();

    if (time) {
      audio.currentTime = time;
    }
  }

  pause() {
    if (!this.isPlatformBrowser) return;

    const audio = this.audioRef().nativeElement;
    audio.pause();
  }

  stop() {
    if (!this.isPlatformBrowser) return;

    const audio = this.audioRef().nativeElement;
    audio.currentTime = 0;
    this.pause();
  }

  // volume
  setVolume(volume: number) {
    if (!this.isPlatformBrowser) return;

    const audio = this.audioRef().nativeElement;
    const clampedVolume = Math.max(0, Math.min(1, volume));
    audio.volume = clampedVolume;
    this.currentVolume.set(clampedVolume);
  }

  mute() {
    this.setVolume(0);
  }

  unmute() {
    this.setVolume(this.volume());
  }

  toggleMute() {
    if (this.currentVolume() === 0) {
      this.unmute();
    } else {
      this.mute();
    }
  }

  // playback speed
  setPlaybackRate(rate: number) {
    if (!this.isPlatformBrowser) return;

    const audio = this.audioRef().nativeElement;
    const clampedRate = Math.max(0.25, Math.min(4, rate)); // Ограничиваем от 0.25x до 4x
    audio.playbackRate = clampedRate;
    this.currentPlaybackRate.set(clampedRate);
  }

  resetPlaybackRate() {
    this.setPlaybackRate(1);
  }

  increasePlaybackRate() {
    const currentRate = this.currentPlaybackRate();
    const newRate = Math.min(4, currentRate + 0.25);
    this.setPlaybackRate(newRate);
  }

  decreasePlaybackRate() {
    const currentRate = this.currentPlaybackRate();
    const newRate = Math.max(0.25, currentRate - 0.25);
    this.setPlaybackRate(newRate);
  }

  // loop
  setLoop(loop: boolean) {
    if (!this.isPlatformBrowser) return;

    const audio = this.audioRef().nativeElement;
    audio.loop = loop;
    this.isLooping.set(loop);
  }

  enableLoop() {
    this.setLoop(true);
  }

  disableLoop() {
    this.setLoop(false);
  }

  toggleLoop() {
    this.setLoop(!this.isLooping());
  }

  // user interaction
  setTime(mouseEvent: MouseEvent) {
    const offsetX = mouseEvent.offsetX;
    const width = this.width;

    const clickPercent = this.calculatePercent(width(), offsetX);

    const time = (clickPercent * this.exactDuration()) / 100;

    void this.play(time);
  }

  // private helpers
  private calculatePercent(total: number, value: number) {
    return (value / total) * 100 || 0;
  }

  private startInterval() {
    interval(100)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          const audio = this.audioRef().nativeElement;
          this.exactCurrentTime.set(audio.currentTime);
        },
      });
  }

  private fetchAudio(audioSrc: string | SafeUrl) {
    this.isLoading.set(true);

    const src =
      typeof audioSrc === 'object'
        ? this.domSanitizer.sanitize(SecurityContext.URL, audioSrc)
        : audioSrc;
    if (!src) {
      console.error('Invalid SafeUrl: could not sanitize');
      this.hasError.set(true);
      return;
    }

    this.httpClient
      .get(src, { responseType: 'arraybuffer' })
      .pipe(
        finalize(() => {
          this.isLoading.set(false);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: async arrayBuffer => {
          try {
            const audioContext = new AudioContext();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            this.exactDuration.set(audioBuffer.duration);

            const filteredData = this.audioWaveService.filterData(audioBuffer);
            this.normalizedData.set(
              this.audioWaveService.normalizeData(filteredData)
            );
          } catch (e) {
            this.hasError.set(true);
          }
        },
        error: error => {
          console.error(error);

          this.hasError.set(true);
        },
      });
  }

  protected pauseChange(event: Event) {
    if (!(event.target instanceof HTMLAudioElement)) return;
    this.isPaused.set(event.target.paused);
  }

  // event handlers
  protected onKeyDown(event: KeyboardEvent) {
    if (!this.isPlatformBrowser) return;

    const audio = this.audioRef().nativeElement;
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
        this.play(leftTime);
        break;

      case 'ArrowRight':
        event.preventDefault();
        const rightTime = Math.min(duration, audio.currentTime + this.skip());
        this.play(rightTime);
        break;

      case 'Home':
        event.preventDefault();
        this.play(0);
        break;

      case 'End':
        event.preventDefault();
        this.play(duration);
        break;
    }
  }
}
