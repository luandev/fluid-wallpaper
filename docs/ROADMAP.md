# Roadmap

The phases describe outcomes. They do not prescribe exact tools or implementation details.

## Current priority across phases

[DEC-010](DECISIONS.md#dec-010--ink-first-web-component-product-direction) prioritizes ink mixing, useful controls, mobile browser performance, and a web component release. The [review's delivery stages](REVIEW_INK_COMPONENT.md#delivery-sequence-and-acceptance-gates) propose correctness fixes, one ink scene, a portable runtime, studio improvements, and package validation. Their APIs, optical techniques, and quality budgets remain open; they are not completed milestones.

The numbered phases below preserve the original wallpaper roadmap. Mobile browser performance now belongs to productization; Phase 6's mobile live-wallpaper target means native platform integration.

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

Status: multi-scale curl-noise composer plus in-page tuner. Optional sparse 2D wind stations stand in for weather samples (heading/speed stream, spin as vorticity). Non-looping palette evolution remains later. Pigment composition is four packed concentrations with named emitters ([DEC-005](DECISIONS.md#dec-005--packed-material-concentrations-and-25d-look)).

## Phase 3 — Material rendering

- Reconstruct surface detail from simulation fields
- Add lighting and material controls
- Produce clearly distinct initial material presets
- Add restrained post-processing where it improves quality

Status: in progress. Dye channels are material amounts; display mixes a 2.5D look (glow, sheen, roughness, metal) with fake normals. Four material slots and eight emitters are the current caps. Separate blur bloom, IBL, and extra dye targets remain later.

## Phase 4 — Productization

- Expose user-facing properties
- Integrate lifecycle and pause behavior
- Add adaptive quality and frame-rate controls
- Validate packaging and release flow

Status: in progress for the in-page product shell. A tabbed React dashboard edits looks, materials, emitters, wind, and presets. Looks can be shared as versioned JSON preset files (merge on import). Value emitters can drive numeric knobs ([DEC-006](DECISIONS.md#dec-006--react-product-shell-dashboard-and-value-drivers)). A GitHub Pages site hosts the live landing, tuner, and React embed from `dist/` ([DEC-007](DECISIONS.md#dec-007--github-pages-showcase), [DEC-008](DECISIONS.md#dec-008--react-fluidfield-embed)). A minimal multi-host HTML wallpaper pack (`wallpaper.html`, WE/Lively manifests, `yarn pack:wallpaper`) is available ([DEC-019](DECISIONS.md#dec-019---multi-host-html-wallpaper-pack)); Workshop upload, user properties, Wallpaper Engine audio listeners, and host-certified GPU evidence remain later. Adaptive ECO quality continues under [DEC-016](DECISIONS.md#dec-016---adaptive-eco-resolution-and-simulation-speed).

## Phase 5 — Expressive inputs

- Add bounded audio response
- Define privacy-conscious optional data adapters
- Live wind / weather files (METAR, GRIB, APIs) would plug into the existing station list; the sim does not fetch them yet

Status: **audio pulse / log spectrum** are live, user-armed drivers ([DEC-009](DECISIONS.md#dec-009--optional-youtube-music-and-web-audio-drivers)). Camera and tilt stay stubs (sample `0.5`, no permissions). Wallpaper Engine audio listeners stay open.

## Phase 6 — Expansion

- Explore ambient scene elements
- Assess a mobile live-wallpaper target
- Evaluate newer GPU paths and additional simulation families
