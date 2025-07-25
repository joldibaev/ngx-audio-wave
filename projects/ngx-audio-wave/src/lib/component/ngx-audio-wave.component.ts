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
  viewChild
} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {isPlatformBrowser} from "@angular/common";
import {finalize, interval} from "rxjs";
import {NgxAudioWaveService} from "../service/ngx-audio-wave.service";
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {DomSanitizer, SafeUrl} from '@angular/platform-browser';

@Component({
  standalone: false,
  selector: 'ngx-audio-wave',
  templateUrl: './ngx-audio-wave.component.html',
  styleUrls: ['./ngx-audio-wave.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NgxAudioWaveComponent implements AfterViewInit, OnDestroy {
  audioSrc = input.required<string | SafeUrl>();

  color = input('#1e90ff');
  height = input(25, {transform: numberAttribute});
  gap = input(5, {transform: numberAttribute})
  rounded = input(true, {transform: booleanAttribute});
  hideBtn = input(false, {transform: booleanAttribute});

  hasError = signal(false);
  exactPlayedPercent = signal(0);
  exactCurrentTime = signal(0);
  isPaused = signal(true);
  isLoading = signal(true);

  exactDuration = signal(0);
  protected normalizedData = signal<number[]>([]);

  protected clipPath = computed(() => `inset(0px ${100 - this.exactPlayedPercent()}% 0px 0px)`)

  // injecting
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isPlatformBrowser = isPlatformBrowser(this.platformId);

  private readonly domSanitizer = inject(DomSanitizer);
  private readonly httpClient = inject(HttpClient);
  private readonly audioWaveService = inject(NgxAudioWaveService);
  private readonly destroyRef = inject(DestroyRef);

  private audioRef = viewChild.required<ElementRef<HTMLAudioElement>>('audioRef');

  playedPercent = computed(() => Math.round(this.exactPlayedPercent()))
  currentTime = computed(() => Math.round(this.exactCurrentTime()))
  duration = computed(() => Math.round(this.exactDuration()));
  width = computed(() => this.audioWaveService.samples * this.gap());

  ngAfterViewInit() {
    if (this.isPlatformBrowser) {
      this.fetchAudio(this.audioSrc());

      this.startInterval();
    }
  }

  ngOnDestroy() {
    this.stop();
  }

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

  private calculatePercent(total: number, value: number) {
    return (value / total) * 100 || 0;
  }

  setTime(mouseEvent: MouseEvent) {
    const offsetX = mouseEvent.offsetX;
    const width = this.width;

    const clickPercent = this.calculatePercent(width(), offsetX);

    const time = (clickPercent * this.exactDuration()) / 100;

    void this.play(time);
  }

  private startInterval() {
    interval(100)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          const audio = this.audioRef().nativeElement;
          if (audio) {
            const percent = this.calculatePercent(this.exactDuration(), audio.currentTime);
            this.exactPlayedPercent.set(percent < 100 ? percent : 100);
            this.exactCurrentTime.set(audio.currentTime);

            this.isPaused.set(audio.paused);
          }
        }
      })
  }

  private fetchAudio(audioSrc: string | SafeUrl) {
    this.isLoading.set(true);

    const src = typeof audioSrc === 'object' ? this.domSanitizer.sanitize(SecurityContext.URL, audioSrc) : audioSrc;
    if (!src) {
      console.error('Invalid SafeUrl: could not sanitize');
      this.hasError.set(true);
      return;
    }

    this.httpClient
      .get(src, {responseType: 'arraybuffer'})
      .pipe(
        finalize(() => {
          this.isLoading.set(false);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: async (arrayBuffer) => {
          try {
            const audioContext = new AudioContext();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            this.exactDuration.set(audioBuffer.duration);

            const filteredData = this.audioWaveService.filterData(audioBuffer);
            this.normalizedData.set(this.audioWaveService.normalizeData(filteredData));
          } catch (e) {
            this.hasError.set(true)
          }
        },
        error: (error) => {
          console.error(error);

          this.hasError.set(true)
        }
      });
  }
}
