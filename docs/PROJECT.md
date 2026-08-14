# Project definition

## Vision

Build a high-end generative wallpaper that behaves like living fluid artwork rather than a looping animation. It should combine continuous color, layered motion, believable material response, and graceful performance scaling.

## Experience principles

- Mesmerizing rather than repetitive
- Smooth, continuous color without obvious banding or seams
- Material and dimensional rather than merely colorful
- Artistically configurable without requiring code edits
- Performance-aware when hidden, paused, or under load

## First target

Desktop Wallpaper Engine is the product target. Phase 0–1 develops and tests in the browser. Wallpaper Engine will later load a static Vite `dist/` bundle, not the Git working tree.

## Core capabilities

- Autonomous, non-looping fluid motion
- Smooth pigment or dye transport
- Distinct material appearances driven by a separate renderer
- Optional pointer and audio influence
- Meaningful user controls for color, motion, material, lighting, and performance
- Adaptive quality and lifecycle-aware throttling

## Non-goals for the first release

- Physically exact three-dimensional fluid simulation
- A heavy game-engine application stack
- AI as the real-time simulation engine
- Mobile parity at launch
- Required external or personal data inputs

## Successful first release

- Runs indefinitely without an obvious loop
- Maintains smooth color fields during motion
- Produces at least three meaningfully different material looks
- Exposes useful artistic controls
- Reduces cost under load and pauses or throttles appropriately
- Builds reproducibly and can be packaged for distribution
- Preserves clear seams for future inputs, scenes, and platforms
