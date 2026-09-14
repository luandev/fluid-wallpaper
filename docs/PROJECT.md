# Project definition

## Vision

Build a high-end generative wallpaper that behaves like living fluid artwork rather than a looping animation. It should combine continuous color, layered motion, believable material response, and graceful performance scaling.

## Experience principles

- Mesmerizing rather than repetitive
- Smooth, continuous color without obvious banding or seams
- Material and dimensional rather than merely colorful
- Artistically configurable without requiring code edits
- Performance-aware when hidden, paused, or under load

## Current product target

As of 2026-09-09, prioritize believable ink mixing, meaningful artist controls, mobile browser performance, and release as a reusable web component ([DEC-010](DECISIONS.md#dec-010--ink-first-web-component-product-direction)). This records the owner's direction, not approval of every technical recommendation in [the review](REVIEW_INK_COMPONENT.md).

Desktop Wallpaper Engine was the original first target and remains a later integration. Its future package should load a static Vite `dist/` bundle, not the Git working tree. Current deliverables include the browser showcase/tuner, private React source embed, native element adapter and an experimental [two-liquid studio](TWO_LIQUID.md). There is no compiled custom-element release or validated mobile support yet.

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
- Native mobile live-wallpaper integration (distinct from mobile browser performance)
- Required external or personal data inputs

## Successful first release

- Ink transport, dilution, and mixing have reviewed visual evidence
- Controls have documented, predictable effects across supported browser frame rates
- The published component has an explicit lifecycle, scoped interaction, and verified consumer installation
- Mobile browser performance is measured on named devices against agreed budgets
- Runs indefinitely without an obvious loop
- Maintains smooth color fields during motion
- Leaves room for multiple material looks without coupling appearance to transport
- Exposes useful artistic controls
- Reduces cost under load and pauses or throttles appropriately
- Builds reproducibly and can be packaged for distribution
- Preserves clear seams for future inputs, scenes, and platforms

The original wallpaper acceptance target included at least three meaningfully different material looks. Whether the first component release retains that target or starts with one thoroughly validated ink scene remains open; the review recommends the latter. Supported devices, optical model, API shape, and numerical budgets also remain open in [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md).
