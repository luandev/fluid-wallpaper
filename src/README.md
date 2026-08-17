# Source

Phase 0–1 layout plus a Phase 2 noise composer, Phase 3 materials, and a React product-shell dashboard. Keep simulation, rendering, platform, and quality boundaries explicit.

- `app/` — config, drivers, engine lifecycle, storage, presets, overlay drag layout
- `ui/` — React dashboard overlay (product shell only)
- `sim/` — GPU resources, capability detection, fluid passes
- `render/` — dye display (no material/PBR yet)
- `inputs/` — pointer / touch stir
- `platform/` — browser resize and visibility
- `quality/` — fixed Phase 1 budgets
- `shaders/` — GLSL ES 3.00 sources (`?raw` imports)
