# Spatial placement

Read [AGENTS.md](AGENTS.md). This overlay places point emitters and wind stations using the supplied canvas rectangle; pointer stirring belongs to [inputs](../../inputs/README.md).

- [uv.ts](uv.ts) converts client coordinates to clamped UV and back. U increases right; V increases upward from the bottom.
- [SpatialOverlay.tsx](SpatialOverlay.tsx) renders markers/rings and handles dragging through selection/move callbacks.
- Styling is in [dashboard.css](../dashboard.css); helpers are covered by [ui-uv.test.ts](../../../tests/ui-uv.test.ts).

Current overlay rendering portals to document.body and spans the viewport. Canvas bounds update for resize/fullscreen, not ordinary scrolling. The radius marker currently uses radius times the short viewport side, while emitter shaders use radius as a Gaussian squared-distance denominator. These are known limitations; see [the review](../../../docs/REVIEW_INK_COMPONENT.md).

For placement changes, verify offset/scrolled canvases, portrait/landscape, pointer capture/cancel, and isolation from stirring. Derive any replacement footprint preview from the actual emitter/wind falloff; a passing coordinate round-trip test does not establish a correct visible influence radius.
