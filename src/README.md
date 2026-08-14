# Source

Phase 0–1 layout. Keep simulation, rendering, platform, and quality boundaries explicit.

- `app/` — config, color helpers, engine lifecycle
- `sim/` — GPU resources, capability detection, fluid passes
- `render/` — dye display (no material/PBR yet)
- `inputs/` — pointer / touch stir
- `platform/` — browser resize and visibility
- `quality/` — fixed Phase 1 budgets
- `shaders/` — GLSL ES 3.00 sources (`?raw` imports)
