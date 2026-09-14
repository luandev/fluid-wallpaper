# Spatial editor: agent context

Scope: `src/ui/spatial/` and descendants. Read [root guidance](../../../AGENTS.md), ancestor instructions, and [this folder's contract](README.md).

Use canvas bounds and the existing bottom-origin UV convention; do not read GPU pixels for placement. Keep coordinate math in uv.ts and input/rendering in SpatialOverlay.tsx. Radius-marker/shader mismatch and body-portal/scroll limitations are known findings, not intended contracts. Coordinate any fix with pointer input, emitter/wind falloffs, and UV tests.

For change recipes and known limitations, see [the engineering guide](../../../docs/ENGINEERING_GUIDE.md). Follow root validation rules and update local context when a contract changes.
