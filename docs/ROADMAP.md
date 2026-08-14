# Roadmap

The phases describe outcomes. They do not prescribe exact tools or implementation details.

## Phase 0 — Foundation

- Confirm repository and documentation conventions
- Validate the target platform's web and lifecycle capabilities
- Establish a minimal full-screen rendering experiment
- Record the initial technology decisions

Status: stack recorded in DEC-003; Vite + WebGL2 full-screen canvas is the Phase 0–1 vehicle. Wallpaper Engine lifecycle APIs remain open.

## Phase 1 — Fluid baseline

- Transport motion and visible pigment reliably
- Maintain stable, smooth color
- Add basic local interaction
- Measure practical quality and performance limits

Status: Phase 0–1 baseline implemented (Stam / GPU Gems ch. 38 family, original passes, marble default look).

## Phase 2 — Generative motion

- Add autonomous force and pigment composition
- Create broad, medium, and fine motion scales
- Establish palette behavior and non-looping evolution

Status: multi-scale curl-noise composer plus in-page tuner. Pigment composition and non-looping palette evolution remain later.

## Phase 3 — Material rendering

- Reconstruct surface detail from simulation fields
- Add lighting and material controls
- Produce clearly distinct initial material presets
- Add restrained post-processing where it improves quality

## Phase 4 — Productization

- Expose user-facing properties
- Integrate lifecycle and pause behavior
- Add adaptive quality and frame-rate controls
- Validate packaging and release flow

## Phase 5 — Expressive inputs

- Add bounded audio response
- Define privacy-conscious optional data adapters

## Phase 6 — Expansion

- Explore ambient scene elements
- Assess a mobile live-wallpaper target
- Evaluate newer GPU paths and additional simulation families
