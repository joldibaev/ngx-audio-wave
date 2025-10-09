# ngx-audio-wave

A modern, accessible audio wave visualization component for Angular 20+ with comprehensive keyboard navigation and screen reader support.

## Features

- 🎵 **Audio Wave Visualization** - Beautiful SVG-based audio wave display
- ⌨️ **Full Keyboard Support** - Complete keyboard navigation (Space, Enter, Arrow keys, Home, End)
- ♿ **Accessibility First** - WCAG 2.1 compliant with ARIA support
- 🎨 **Highly Customizable** - Colors, dimensions, gaps, and styling options
- 📱 **Responsive Design** - Works on all screen sizes
- 🚀 **Modern Angular** - Built with Angular 20+ signals and standalone components
- 🎯 **TypeScript** - Full type safety and IntelliSense support

## Demo

![Audio Wave Demo](https://github.com/joldibaev/ngx-audio-wave/raw/master/public/demo3.png)

## Quick Start

### Installation

```bash
npm install ngx-audio-wave
```

### Angular 20+ (Standalone Components)

```ts
import { NgxAudioWave } from 'ngx-audio-wave';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NgxAudioWave],
  template: `
    <ngx-audio-wave
      ariaLabel="My audio player"
      audioSrc="path/to/your/audio.mp3"
    >
    </ngx-audio-wave>
  `,
})
export class AppComponent {}
```

## Basic Usage

```html
<ngx-audio-wave
  ariaLabel="My podcast episode"
  audioSrc="https://example.com/audio.mp3"
>
</ngx-audio-wave>
```

### With Progress Information

```html
<ngx-audio-wave #player audioSrc="assets/audio.mp3"></ngx-audio-wave>

<div class="audio-info">
  <p>Progress: {{ player.exactPlayedPercent() | number:'1.1-1' }}%</p>
  <p>
    Time: {{ player.exactCurrentTime() | number:'1.1-1' }}s / {{
    player.exactDuration() | number:'1.1-1' }}s
  </p>
  <p>Status: {{ player.statusText() }}</p>
</div>
```

> **Note:** Use `exact*` properties instead of deprecated `currentTime`, `duration`, and `playedPercent` for better precision.

## Examples

### Custom Styling

```html
<ngx-audio-wave
  [gap]="3"
  [height]="50"
  [rounded]="false"
  audioSrc="assets/audio.mp3"
  color="#ff6b6b"
>
</ngx-audio-wave>
```

### With Custom Accessibility Labels

```html
<ngx-audio-wave
  ariaLabel="Weekly Tech Podcast Episode 42"
  audioSrc="assets/podcast.mp3"
  pauseButtonLabel="Pause podcast"
  playButtonLabel="Start podcast"
  progressBarLabel="Podcast progress - use arrow keys to navigate"
>
</ngx-audio-wave>
```

### Hide Default Button

```html
<ngx-audio-wave [hideBtn]="true" #audioPlayer audioSrc="assets/audio.mp3">
</ngx-audio-wave>

<button (click)="audioPlayer.play()">▶️ Play</button>
<button (click)="audioPlayer.pause()">⏸️ Pause</button>
<button (click)="audioPlayer.stop()">⏹️ Stop</button>
```

### Volume Control

```html
<ngx-audio-wave #player audioSrc="assets/audio.mp3"></ngx-audio-wave>

<div class="volume-controls">
  <button (click)="player.mute()">🔇 Mute</button>
  <button (click)="player.unmute()">🔊 Unmute</button>
  <button (click)="player.toggleMute()">🔊/🔇 Toggle</button>
  <button (click)="player.setVolume(0.5)">50% Volume</button>
  <button (click)="player.setVolume(1)">100% Volume</button>
</div>

<p>Current volume: {{ player.currentVolume() | percent }}</p>
```

### Playback Speed Control

```html
<ngx-audio-wave #player audioSrc="assets/audio.mp3"></ngx-audio-wave>

<div class="speed-controls">
  <button (click)="player.decreasePlaybackRate()">⏪ Slower</button>
  <button (click)="player.resetPlaybackRate()">1x Normal</button>
  <button (click)="player.increasePlaybackRate()">⏩ Faster</button>
  <button (click)="player.setPlaybackRate(0.5)">0.5x</button>
  <button (click)="player.setPlaybackRate(1.5)">1.5x</button>
  <button (click)="player.setPlaybackRate(2)">2x</button>
</div>

<p>Current speed: {{ player.currentPlaybackRate() }}x</p>
```

### Loop Control

```html
<ngx-audio-wave #player audioSrc="assets/audio.mp3"></ngx-audio-wave>

<div class="loop-controls">
  <button (click)="player.enableLoop()">🔄 Enable Loop</button>
  <button (click)="player.disableLoop()">⏹️ Disable Loop</button>
  <button (click)="player.toggleLoop()">🔄/⏹️ Toggle Loop</button>
</div>

<p>Looping: {{ player.isLooping() ? 'Enabled' : 'Disabled' }}</p>

<!-- Auto-loop example -->
<ngx-audio-wave 
  [loop]="true" 
  audioSrc="assets/background-music.mp3"
  ariaLabel="Background music with auto-loop">
</ngx-audio-wave>
```

### Different Heights and Gaps

```html
<!-- Different heights -->
<ngx-audio-wave [height]="25" audioSrc="assets/audio.mp3"></ngx-audio-wave>
<ngx-audio-wave [height]="50" audioSrc="assets/audio.mp3"></ngx-audio-wave>
<ngx-audio-wave [height]="100" audioSrc="assets/audio.mp3"></ngx-audio-wave>

<!-- Different gaps -->
<ngx-audio-wave [gap]="1" audioSrc="assets/audio.mp3"></ngx-audio-wave>
<ngx-audio-wave [gap]="5" audioSrc="assets/audio.mp3"></ngx-audio-wave>
<ngx-audio-wave [gap]="10" audioSrc="assets/audio.mp3"></ngx-audio-wave>
```

## Accessibility Features

This component is built with accessibility as a core feature, ensuring it works seamlessly with assistive technologies and keyboard navigation.

### Keyboard Navigation

| Key                | Action                                    |
| ------------------ | ----------------------------------------- |
| `Space` or `Enter` | Play/Pause audio                          |
| `Arrow Left`       | Skip backward (configurable with `skip`)  |
| `Arrow Right`      | Skip forward (configurable with `skip`)   |
| `Home`             | Jump to beginning                         |
| `End`              | Jump to end                               |

### Screen Reader Support

- **ARIA Labels**: All interactive elements have descriptive labels
- **Live Regions**: Status changes are announced automatically
- **Progress Information**: Detailed progress text with time and percentage
- **Semantic Roles**: Proper ARIA roles for all components
- **Focus Management**: Logical tab order and focus indicators

### Testing with Screen Readers

The component has been tested with:

- **NVDA** (Windows)
- **JAWS** (Windows)
- **VoiceOver** (macOS/iOS)
- **TalkBack** (Android)

## API Reference

### Input Properties

| Property           | Type                | Default                | Description                                |
| ------------------ | ------------------- | ---------------------- | ------------------------------------------ |
| `audioSrc`         | `string \| SafeUrl` | **Required**           | URL or SafeUrl of the audio file to play   |
| `color`            | `string`            | `'#1e90ff'`            | Color of the audio wave bars               |
| `height`           | `number`            | `25`                   | Height of the wave visualization in pixels |
| `gap`              | `number`            | `5`                    | Gap between wave bars in pixels            |
| `rounded`          | `boolean`           | `true`                 | Whether to round the corners of wave bars  |
| `hideBtn`          | `boolean`           | `false`                | Hide the play/pause button                 |
| `skip`             | `number`            | `5`                    | Seconds to skip when using arrow keys      |
| `volume`           | `number`            | `1`                    | Initial volume level (0-1)                 |
| `playbackRate`     | `number`            | `1`                    | Initial playback speed (0.25-4)            |
| `loop`             | `boolean`           | `false`                | Whether to loop the audio                  |
| `ariaLabel`        | `string`            | `'Audio player'`       | Main ARIA label for the component          |
| `playButtonLabel`  | `string`            | `'Play audio'`         | ARIA label for the play button             |
| `pauseButtonLabel` | `string`            | `'Pause audio'`        | ARIA label for the pause button            |
| `progressBarLabel` | `string`            | `'Audio progress bar'` | ARIA label for the progress bar            |

### Output Properties (Signals)

| Property             | Type              | Description                                                |
| -------------------- | ----------------- | ---------------------------------------------------------- |
| `isPaused`           | `Signal<boolean>` | Whether the audio is currently paused                      |
| `isLoading`          | `Signal<boolean>` | Whether the audio is currently loading                     |
| `hasError`           | `Signal<boolean>` | Whether there was an error loading the audio               |
| `currentVolume`      | `Signal<number>`  | Current volume level (0-1)                                 |
| `currentPlaybackRate`| `Signal<number>`  | Current playback speed (0.25-4)                            |
| `isLooping`          | `Signal<boolean>` | Whether the audio is currently looping                     |
| `exactCurrentTime`   | `Signal<number>`  | Current playback time in seconds (exact)                   |
| `exactDuration`      | `Signal<number>`  | Total duration in seconds (exact)                          |
| `exactPlayedPercent` | `Signal<number>`  | Playback progress as percentage (exact)                    |
| `currentTime`        | `Signal<number>`  | **Deprecated** - Current playback time rounded to seconds  |
| `duration`           | `Signal<number>`  | **Deprecated** - Total duration rounded to seconds         |
| `playedPercent`      | `Signal<number>`  | **Deprecated** - Playback progress as percentage (rounded) |
| `progressText`       | `Signal<string>`  | Human-readable progress text for screen readers            |
| `statusText`         | `Signal<string>`  | Current status text for screen readers                     |

### Methods

| Method                | Parameters      | Description                                     |
| --------------------- | --------------- | ----------------------------------------------- |
| `play(time?: number)` | `time?: number` | Play the audio, optionally from a specific time |
| `pause()`             | -               | Pause the audio                                 |
| `stop()`              | -               | Stop the audio and reset to beginning           |
| `setVolume(volume)`   | `volume: number`| Set volume level (0-1)                          |
| `mute()`              | -               | Mute the audio                                  |
| `unmute()`            | -               | Unmute the audio                                |
| `toggleMute()`        | -               | Toggle mute state                               |
| `setPlaybackRate(rate)`| `rate: number` | Set playback speed (0.25-4)                     |
| `resetPlaybackRate()` | -               | Reset playback speed to 1x                      |
| `increasePlaybackRate()`| -             | Increase playback speed by 0.25x                |
| `decreasePlaybackRate()`| -             | Decrease playback speed by 0.25x                |
| `setLoop(loop)`         | `loop: boolean`| Enable or disable audio looping                 |
| `enableLoop()`          | -             | Enable audio looping                            |
| `disableLoop()`         | -             | Disable audio looping                           |
| `toggleLoop()`          | -             | Toggle loop state                               |

## Contributing

We welcome contributions! Please feel free to submit issues and pull requests.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- 📧 Email: nurlan@joldibaev.uz
- 🐛 Issues: [GitHub Issues](https://github.com/joldibaev/ngx-audio-wave/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/joldibaev/ngx-audio-wave/discussions)

---

**Made with ❤️ by [Joldibaev Nurlan](https://github.com/joldibaev)**
