# Architecture boundaries

This document describes responsibilities, not a fixed technology stack.

## Product shell

Owns settings, presets, lifecycle events, user-facing state, and platform coordination.

## Simulation

Owns evolving fields such as motion, pressure-like constraints, pigment, density, thickness, or other material signals.

The simulation moves and transforms fields. It does not decide the final visual material.

## Rendering

Owns color interpretation, surface detail, normals, lighting, material response, tone mapping, glow, and final presentation.

The same simulation state should support multiple visual identities.

## Inputs

Owns optional pointer, audio, sensor, or external-data adapters. Every input must be bounded, optional, and able to disappear without breaking the artwork.

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

Confirmed in [DEC-003](DECISIONS.md#dec-003--typescript-vite-webgl2-and-glsl): TypeScript application logic, Vite for development and static builds, WebGL2 + GLSL ES 3.00 for simulation and display. The browser adapter lives in `src/platform`; Wallpaper Engine integration remains a later platform module. Simulation must not decide material appearance.
