# Open questions

Each question should be resolved through a research issue before it becomes an implementation constraint.

## Platform

- Which Wallpaper Engine APIs should handle properties, visibility, pause state, audio, and performance signals?
- What lifecycle behavior can be relied on across supported environments?

## GPU capabilities

- Which texture formats, filtering modes, and render-target features are consistently available on target hardware?
- What fallback behavior preserves a complete experience on limited devices?

Phase 0–1 detects `EXT_color_buffer_float` / `EXT_color_buffer_half_float` at runtime and prefers `RGBA16F`. Broader hardware evidence is still needed before locking quality presets.

## Quality budgets

- What internal resolution and iteration budgets define the initial quality levels?
- Which settings should reduce first under frame-time pressure?
- How should update rate and display frame rate be separated?

Phase 1 uses a fixed budget (see `src/quality/budgets.ts`). Adaptive quality is Phase 4.

## Visual state

- How many independent pigment or material fields are useful before memory bandwidth dominates?
- Which derived fields best support depth and material response?

## Technology choices

Resolved by [DEC-003](DECISIONS.md#dec-003--typescript-vite-webgl2-and-glsl):

- First GPU path: WebGL2 + GLSL ES 3.00
- Language and build: TypeScript + Vite (`base: './'`)
- Package manager: Yarn Classic only ([DEC-004](DECISIONS.md#dec-004--yarn-only))
- Tests: Vitest for CPU utilities
- Experimental WebGPU: deferred to Phase 6

## Distribution

- What reproducible packaging process best maps source releases to Workshop releases?
- Which assets, licenses, and attribution records are required before publishing?

Until Phase 4, Wallpaper Engine testing means importing the Vite `dist/` folder (the `index.html` inside it), never the Git working tree.
