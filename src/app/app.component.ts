import {Component, computed, inject, signal} from '@angular/core';
import {ToTimerPipe} from './pipes/to-timer.pipe';
import {DomSanitizer} from '@angular/platform-browser';
import {DecimalPipe} from '@angular/common';
import {NgxAudioWave} from 'ngx-audio-wave';

@Component({
  selector: 'app-root',
  imports: [ToTimerPipe, DecimalPipe, NgxAudioWave],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  private domSanitizer = inject(DomSanitizer)

  audioSrcLink = signal('https://cdn.freesound.org/previews/219/219167_3162775-lq.ogg');
  audioSrcLinkSafeUrl = computed(() => this.domSanitizer.bypassSecurityTrustUrl(this.audioSrcLink()));

  audioSrc = signal('sample-15s.mp3');
}
