# Architecture boundaries

This document describes responsibilities, not a fixed technology stack.

## Product shell

Owns settings, presets, lifecycle events, user-facing state, the **React dashboard overlay**, and platform coordination. Overlay positions persist in `localStorage` separately from look config. React does not own simulation or the renderer ([DEC-006](DECISIONS.md#dec-006--react-product-shell-dashboard-and-value-drivers)).

## Simulation

Owns evolving fields such as motion, pressure-like constraints, pigment **concentrations**, density, thickness, or other material signals.

The simulation moves and transforms fields. It does not decide the final visual material. Dye stores up to four concentration channels, not painted RGB. A derived viscosity weight may damp velocity where a material is dense; that is thickness, not look ([DEC-005](DECISIONS.md#dec-005--packed-material-concentrations-and-25d-look)).

## Rendering

Owns color interpretation, surface detail, normals, lighting, material response, tone mapping, glow, and final presentation.

The same concentration field should support multiple visual identities (glow, sheen, roughness, metal) mixed by channel weight.

## Inputs

Owns optional pointer, **sparse 2D wind stations**, **value emitters** (waves now; mic / camera / tilt as stubs), audio, sensor, or external-data adapters. Wind stations are procedural stand-ins for weather-sample points (heading, speed, spin). Live METAR/GRIB/API feeds stay a later optional adapter. Every input must be bounded, optional, and able to disappear without breaking the artwork.

## Platform integration

Owns Wallpaper Engine and future platform APIs, including lifecycle, properties, packaging, and platform-specific capability checks.

## Quality management

Owns frame-time observation and adaptive choices such as simulation resolution, iteration budgets, update rate, and optional rendering effects.

## Boundaries to preserve

- Platform APIs should not leak into the simulation core.
- Rendering materials should not be baked into fluid transport.
- External data should never be required for a complete visual experience.
- Quality changes should be centralized and observable.
- Experimental paths should remain replaceable until validated.

## Leading technical direction

Confirmed in [DEC-003](DECISIONS.md#dec-003--typescript-vite-webgl2-and-glsl): TypeScript application logic, Vite for development and static builds, WebGL2 + GLSL ES 3.00 for simulation and display. The in-page tuner is a React overlay ([DEC-006](DECISIONS.md#dec-006--react-product-shell-dashboard-and-value-drivers)). The browser adapter lives in `src/platform`; Wallpaper Engine integration remains a later platform module. Simulation transports concentrations and may apply derived thickness; the renderer owns look ([DEC-002](DECISIONS.md#dec-002--separate-simulation-from-appearance), [DEC-005](DECISIONS.md#dec-005--packed-material-concentrations-and-25d-look)).
