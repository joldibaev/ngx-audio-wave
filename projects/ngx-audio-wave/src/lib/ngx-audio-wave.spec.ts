import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DomSanitizer } from '@angular/platform-browser';
import { NgxAudioWave } from './ngx-audio-wave';
import { vi } from 'vitest';

@Component({
  imports: [NgxAudioWave],
  template: `
    <ngx-audio-wave
      #player
      [audioSrc]="audioSrc"
      [gap]="gap"
      [hideBtn]="hideBtn"
      [loop]="loop"
      [playbackRate]="playbackRate"
      [samples]="samples"
      [skip]="skip"
      [volume]="volume"
    />
  `,
})
class HostComponent {
  audioSrc: string | ReturnType<DomSanitizer['bypassSecurityTrustUrl']> =
    '/audio.mp3';
  gap = 5;
  hideBtn = false;
  loop = false;
  playbackRate = 1;
  samples = 4;
  skip = 5;
  volume = 1;
}

describe('NgxAudioWave', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let http: HttpTestingController;
  let audioContextSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    audioContextSpy = vi.fn(function AudioContextMock() {
      return {
        close: vi.fn().mockResolvedValue(undefined),
        decodeAudioData: vi.fn().mockResolvedValue({
          duration: 10,
          getChannelData: () => Float32Array.from([0, 0.5, -1, 0.25]),
        }),
      };
    });
    vi.stubGlobal('AudioContext', audioContextSpy);
    Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value: vi.fn().mockResolvedValue(undefined),
    });

    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('loads and renders waveform data', async () => {
    fixture.detectChanges();
    flushAudioRequest();
    await settleAsyncAudioDecode();
    fixture.detectChanges();

    expect(audioContextSpy).toHaveBeenCalled();
    expect(component().exactDuration()).toBe(10);
    expect(waveRects().length).toBe(4);
  });

  it('keeps public playback settings in sync with inputs before playback', () => {
    host.volume = 0.3;
    host.playbackRate = 1.5;
    host.loop = true;

    fixture.detectChanges();
    flushAudioRequest();

    expect(component().currentVolume()).toBe(0.3);
    expect(component().currentPlaybackRate()).toBe(1.5);
    expect(component().isLooping()).toBe(true);
    expect(audioElement().volume).toBe(0.3);
    expect(audioElement().playbackRate).toBe(1.5);
    expect(audioElement().loop).toBe(true);
  });

  it('uses sanitized SafeUrl for the audio element and request', () => {
    const sanitizer = TestBed.inject(DomSanitizer);
    host.audioSrc = sanitizer.bypassSecurityTrustUrl('/safe-audio.mp3');

    fixture.detectChanges();

    expect(audioElement().getAttribute('src')).toBe('/safe-audio.mp3');
    http.expectOne('/safe-audio.mp3').flush(new ArrayBuffer(8));
  });

  it('plays, pauses, and stops audio', () => {
    fixture.detectChanges();
    flushAudioRequest();

    const audio = audioElement();
    const playSpy = vi.spyOn(audio, 'play').mockResolvedValue(undefined);
    const pauseSpy = vi.spyOn(audio, 'pause');

    component().play();
    component().pause();
    audio.currentTime = 5;
    component().stop();

    expect(playSpy).toHaveBeenCalled();
    expect(pauseSpy).toHaveBeenCalledTimes(2);
    expect(audio.currentTime).toBe(0);
  });

  it('seeks to zero when play receives 0', () => {
    fixture.detectChanges();
    flushAudioRequest();

    const audio = audioElement();
    vi.spyOn(audio, 'play').mockResolvedValue(undefined);
    audio.currentTime = 5;

    component().play(0);

    expect(audio.currentTime).toBe(0);
  });

  it('seeks using container-relative pointer coordinates', () => {
    fixture.detectChanges();
    flushAudioRequest();
    component().exactDuration.set(20);

    const slider = sliderElement();
    vi.spyOn(slider, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      width: 200,
    } as DOMRect);

    slider.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        clientX: 150,
      })
    );

    expect(audioElement().currentTime).toBe(5);
  });

  it('keyboard arrows seek without forcing playback', () => {
    fixture.detectChanges();
    flushAudioRequest();
    component().exactDuration.set(20);

    const audio = audioElement();
    const playSpy = vi.spyOn(audio, 'play').mockResolvedValue(undefined);
    audio.currentTime = 10;

    sliderElement().dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        key: 'ArrowRight',
      })
    );

    expect(audio.currentTime).toBe(15);
    expect(playSpy).not.toHaveBeenCalled();
  });

  it('shows an error when waveform loading fails', () => {
    fixture.detectChanges();

    http.expectOne('/audio.mp3').flush(new ArrayBuffer(0), {
      status: 404,
      statusText: 'Not Found',
    });
    fixture.detectChanges();

    expect(component().hasError()).toBe(true);
  });

  function flushAudioRequest(): void {
    http.expectOne(String(host.audioSrc)).flush(new ArrayBuffer(8));
  }

  async function settleAsyncAudioDecode(): Promise<void> {
    await fixture.whenStable();
    await new Promise(resolve => setTimeout(resolve));
  }

  function component(): NgxAudioWave {
    return fixture.debugElement.query(By.directive(NgxAudioWave))
      .componentInstance;
  }

  function audioElement(): HTMLAudioElement {
    return fixture.nativeElement.querySelector('audio');
  }

  function sliderElement(): HTMLElement {
    return fixture.nativeElement.querySelector('.ngx-audio-wave');
  }

  function waveRects(): SVGRectElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('svg rect'));
  }
});
