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

Status: in progress for the in-page product shell. A tabbed React dashboard edits looks, materials, emitters, wind, and presets. Looks can be shared as versioned JSON preset files (merge on import). Value emitters can drive numeric knobs ([DEC-006](DECISIONS.md#dec-006--react-product-shell-dashboard-and-value-drivers)). A GitHub Pages site hosts the live landing + tuner from `dist/` ([DEC-007](DECISIONS.md#dec-007--github-pages-showcase)). Wallpaper Engine properties, pause lifecycle, and adaptive quality remain later.

## Phase 5 — Expressive inputs

- Add bounded audio response
- Define privacy-conscious optional data adapters
- Live wind / weather files (METAR, GRIB, APIs) would plug into the existing station list; the sim does not fetch them yet

Status: driver **kinds** `mic`, `camera`, and `tilt` exist as stubs (sample `0.5`, no permissions). Real getUserMedia / orientation adapters stay here.

## Phase 6 — Expansion

- Explore ambient scene elements
- Assess a mobile live-wallpaper target
- Evaluate newer GPU paths and additional simulation families
