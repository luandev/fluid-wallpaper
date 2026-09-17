# Promotional video production

This local workflow produces an 80-second 1920×1080 showcase and a separately composed 28-second 1080×1920 teaser, both at 30 fps. It imports the existing WebGL Engine, dashboard, native/React heroes and experimental studio. Nothing here is a shipped application entry or public API.

## Reproduce

Run from the repository root with existing dependencies, Node 24 (built-in WebSocket), local Chromium, FFmpeg and FFprobe. No dependency installation is part of this workflow. `BROWSER_PATH`, `FFMPEG_PATH` and `FFPROBE_PATH` override executable locations; defaults use Windows Chrome and FFmpeg on PATH. Launches use hidden windows and fresh temporary browser profiles, never the owner's normal profile.

```powershell
yarn test
yarn build
node tools/promo/music.mjs
node tools/promo/render.mjs smoke
node tools/promo/render.mjs audio
node tools/promo/render.mjs showcase
node tools/promo/render.mjs teaser
node tools/promo/finish.mjs
node tools/promo/review.mjs
```

Vite binds loopback port 5199 during capture (`PROMO_PORT` overrides it). Finish each render command before starting another on the same port. To revise individual shots, pass comma-separated IDs, for example `node tools/promo/render.mjs showcase materials,lighting`. Then rerun `finish.mjs`. Review outputs before delivery; the encoder checks do not judge artistic quality.

If installed package entry files exist but Yarn cannot find Windows launchers, temporary `.cmd` wrappers outside the repository may point `vitest`, `tsc` and `vite` at their installed Node entry files. Prepend that temporary folder to PATH, then run the unchanged Yarn scripts. Do not install missing packages.

## Files and timing

- [shots.mjs](shots.mjs) owns the edit order, exact frame counts and captions for each aspect ratio.
- [stage.tsx](stage.tsx) hosts the real renderer/UI, applies in-memory authored settings and scripts control changes. [style.css](style.css) composes captions and capture layouts.
- [render.mjs](render.mjs) captures each output frame through [cdp.mjs](cdp.mjs), then feeds it into FFmpeg with backpressure. It retains start/middle/end JPEGs, shot settings, action evidence, browser/GPU details and audio-driven values alongside each shot.
- [music.mjs](music.mjs) synthesizes the original instrumental **Chromatic currents**: 120 BPM, D minor, percussion, bass, arpeggio and detuned chord beds. All sound is generated mathematically; there are no third-party recordings or samples. The deterministic seed is 91317. Stereo PCM16 master: 48 kHz, 80 seconds.
- [finish.mjs](finish.mjs) verifies shot lengths, assembles clean cuts and a 0.2-second closing dissolve, exports H.264/yuv420p + AAC with fast-start metadata, creates PNG posters and a local playback page, and decodes the full videos for format, black-frame, freeze and audio-level checks. A six-frame held outgoing handle under the first six closing frames keeps both timelines at their exact requested durations.
- [review.mjs](review.mjs) creates first/middle/last contact sheets and plays both complete exports in local Chrome, retaining playback evidence. It requires finished exports and a free loopback port 5199.

Generated assets are under `promo-output/`: `fluid-wallpaper-showcase.mp4`, `fluid-wallpaper-teaser.mp4`, posters, `soundtrack.wav`, `teaser-soundtrack.wav`, `index.html`, edit manifests and validation logs. This directory is ignored. Preserve it locally for revisions; do not commit generated footage.

## Capture semantics and evidence boundaries

The capture stage replaces only its own `requestAnimationFrame` scheduler. Each screenshot follows one controlled 1/30-second callback batch and GPU completion; the existing legacy runtime still performs its normal fixed simulation steps. Encoder latency cannot cause simulation frames to be skipped. This is offline capture, not a claim of real-time performance. In-memory production settings increase internal resolution and warmup; source presets are untouched. Portrait uses its own simulation aspect and framing, not a crop of the showcase.

Pointer choreography uses the Engine's existing injection API with pointer-style positions/deltas. Controls use actual React input/change handlers. The experimental studio demonstrates authored optical/pigment controls while paused; it does not claim validated two-liquid dynamics. Legacy lighting direction is fixed: the lighting shot adjusts available roughness, metallic and sheen, not an invented light-position control. Camera/tilt stubs are excluded.

The audio step sends `analyser-input.wav` (master seconds 43–55) through Chromium's fake microphone and the app's unmodified `AudioAnalyser.setSource('microphone')` and `sample` implementation. It records 360 real-time analyser frames. During offline rendering the capture host replays those measured audio frames into the existing driver path at 30 fps. It does not generate substitute beat envelopes or claim the screenshot loop itself is real-time microphone capture. The showcase audio shot uses the first 10 seconds; the teaser uses the first six. The teaser soundtrack joins master seconds 0–17, 43–49 and 75–80 so the measured audio sequence matches its footage. Browser audio-start latency and spectral-window smoothing apply; this is not sample-accurate input latency measurement.

Optional music-video UI is shown with a placeholder ID and external media requests blocked. No third-party video or audio is reproduced. Integration captions describe available source/package capabilities without mobile, host-certification or performance claims.

## Feature-to-shot checklist

| Showcase time | Shot IDs                                            | Evidence to review                                                  |
| ------------- | --------------------------------------------------- | ------------------------------------------------------------------- |
| 0–7           | hook                                                | Actual warmed WebGL composition and opening title                   |
| 7–19          | aurora, ember, cobalt, verdant, porcelain, obsidian | Six source palettes with authored capture resolution/framing        |
| 19–23         | pointer                                             | Injected pointer path and resulting pigment interaction             |
| 23–31         | materials, lighting                                 | Color, glow, sheen, roughness and metallic changes in real UI       |
| 31–39         | emitters, wind                                      | Add/place controls, source markers and resulting flow               |
| 39–43         | drivers                                             | Actual sine driver, binding and varying material response           |
| 43–53         | audio                                               | Recorded analyser activity and per-frame live glow values           |
| 53–56         | backgrounds                                         | Solid, gradient and transparent modes over visible host backing     |
| 56–58         | presets                                             | Save and load through actual dashboard handlers                     |
| 58–61         | heroes                                              | Actual native hero and React FluidHero instances                    |
| 61–63         | music                                               | Optional music controls, external media blocked                     |
| 63–70         | liquid                                              | Experimental label throughout; real studio optical/pigment controls |
| 70–75         | distribution                                        | Component, React, desktop HTML capabilities and ECO runtime         |
| 75–80         | close                                               | Project name, invitation and project URL                            |

Inspect every shot at full size and during playback, especially UI legibility, material transitions and experimental labeling. Run full export decoding and browser playback, inspect the audio logs for clipping, and record findings in [VALIDATION.md](VALIDATION.md). CPU tests/build are separate from GPU/render evidence. Publishing is outside this task.
