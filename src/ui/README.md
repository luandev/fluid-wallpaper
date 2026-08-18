# UI

## Purpose

The in-page **product-shell overlay**: tabbed dashboard, crimson glass styling, on-canvas UV markers, a driver node graph, and JSON preset file pickers. Artists edit **base** looks here. The canvas artwork must still run with the panel closed.

## Architecture overview

```mermaid
flowchart TB
  dash[Dashboard shell]
  rows[rows]
  scene[tabs/Scene]
  mats[tabs/Materials]
  emit[tabs/Emitters]
  wind[tabs/Wind]
  drivers[tabs/Drivers]
  presets[tabs/Presets]
  graph[graph]
  spatial[spatial]
  keys[shortcuts]
  engine[Engine]
  store[saveStoredConfig]
  dash --> rows
  dash --> scene
  dash --> mats
  dash --> emit
  dash --> wind
  dash --> drivers
  dash --> presets
  drivers --> graph
  emit --> spatial
  wind --> spatial
  dash --> keys
  dash -->|applyConfig base| engine
  dash --> store
```

`main.ts` mounts React on `#dash`. Pointer on the canvas is `src/inputs`, not this folder. While Emitters or Wind is open, an HTML overlay captures pointer over the field so stir does not fight UV placement. Perf HUD stays vanilla DOM in `src/app/perfHud.ts` but shares drag/layout helpers and shortcut mapping. `FluidField` can pass its own canvas and turn `persist` off.

## Paradigms

- React is shell only ([DEC-006](../../docs/DECISIONS.md#dec-006--react-product-shell-dashboard-and-value-drivers)). No solver steps, no shader strings, no WebGL.
- Controlled rows show **base**; **live** is a readout when a driver is bound.
- One concern per file: tabs, rows, graph math, UV math, shortcuts. Logic that can run without `document` lives in `.ts` next to the view.
- Hide with **H**; **P** toggles perf; **F** fullscreen on the canvas; **Esc** exits fullscreen. Dragging the header (or Panel button) persists position.
- Numeric rows: Tab focuses the typed value (crimson outline); mouse wheel and stepper arrows nudge by `step` (Shift for fine). Dashboard chrome is not text-selectable; fields still are.
- Item cards (materials, emitters, wind, value emitters) collapse and duplicate. Duplicate is a new id under the same cap; collapse is session-only, not stored in the look.

## Enforced patterns

- No MUI/shadcn, React Flow, or other component libraries.
- Persist on user edits when `persist` is true (tuner default), never on the rAF live poll.
- Import presets through `parsePresetJson` → `mergeImportedPresets` → `savePresets`. Fail closed (`console.warn`); do not throw into the engine.
- Do not call `getUserMedia`. Stub driver kinds stay labeled “later”.
- Do not pick GPU pixels for placement; map the canvas `getBoundingClientRect()` through `clientToUv`.
- Keep Vite-relative assets; this overlay is part of `dist/`.
- Do not mount this overlay from the landing page.

## Key files

- `Dashboard.tsx` — shell, tabs, commit, H/F/Esc, spatial wiring; `canvas` + `persist` props for embeds
- `tabs/` — Scene, Materials, Emitters, Wind, Drivers, Presets
- `ItemCard.tsx` / `duplicateItem.ts` — collapse + duplicate for list cards
- `rows.tsx` / `rangeMath.ts` / `format.ts` — slider + number field, Shift fine step, stepper arrows, wheel nudge, help
- `graph/` — SVG node graph over `valueBindings`
- `spatial/` — UV markers for point emitters and wind stations
- `shortcuts.ts` — H/P/F/Esc mapping (shared with perf HUD)
- `dashboard.css` — centered ~960px glass panel
- `presetFile.ts` — download JSON
