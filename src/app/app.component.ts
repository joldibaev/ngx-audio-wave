import {Component, computed, inject, signal} from '@angular/core';
import {ToTimerPipe} from './pipes/to-timer.pipe';
import {NgxAudioWaveModule} from '../../projects/ngx-audio-wave/src/lib/ngx-audio-wave.module';
import {DomSanitizer} from '@angular/platform-browser';

@Component({
  selector: 'app-root',
  imports: [NgxAudioWaveModule, ToTimerPipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  audioText = '<audio>';

  private domSanitizer = inject(DomSanitizer)

  audioSrcLink = signal('https://cdn.freesound.org/previews/219/219167_3162775-lq.ogg');
  audioSrcLinkSafeUrl = computed(() => this.domSanitizer.bypassSecurityTrustUrl(this.audioSrcLink()));

  audioSrc = signal('sample-15s.mp3');
}
