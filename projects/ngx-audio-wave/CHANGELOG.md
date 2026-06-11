# Changelog

## 22.0.0

- Made `audioSrc`, `volume`, `playbackRate`, `loop`, and `samples` react to
  input changes after initialization.
- Added the `samples` input for waveform density control.
- Improved seek behavior so `play(0)` works and keyboard seeking does not
  force playback.
- Replaced constant time polling with media events and playback-only animation
  frame synchronization.
- Hardened waveform generation for short and silent audio files.
- Updated accessibility semantics for the seek control from progressbar to
  slider.
- Removed deprecated rounded state signals.
- Documented Angular compatibility and the `provideHttpClient()` requirement.
- Angular 22 compatible release.


