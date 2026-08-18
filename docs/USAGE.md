# Using the fluid field

Ways to run this wallpaper. The solver is always `Engine` in TypeScript; React never steps it ([DEC-006](DECISIONS.md), [DEC-008](DECISIONS.md)).

## Landing page

Full-viewport field with editorial chrome. No dashboard.

- Dev: `yarn dev` → `index.html`
- Live: [luandev.github.io/fluid-wallpaper](https://luandev.github.io/fluid-wallpaper/)
- Boot: `src/landing/main.ts` → `new Engine(canvas, loadStoredConfig())`

Pointer still stirs the field. **H / P / F** do nothing here.

## Tuner

Artist dashboard, perf HUD, spatial UV markers.

- Dev: `/play.html`
- Live: [play.html](https://luandev.github.io/fluid-wallpaper/play.html)
- Boot: `src/main.ts` → Engine + `mountDashboard` + `mountPerfHud`

**H** panel, **P** perf, **F** canvas fullscreen, **Esc** exit. Base config persists in `localStorage` (`fluid-wallpaper.config.v9`).

## React embed demo

Same `FluidField` host the package exports, with a switch for canvas-only vs dashboard.

- Dev: `/embed.html`
- Live: [embed.html](https://luandev.github.io/fluid-wallpaper/embed.html)
- Boot: `src/react/embed.tsx`

This page uses `persist={false}` so it does not share the tuner store.

## React component

Install this repo with Yarn (package stays private; no npm registry publish):

```bash
yarn add react react-dom
yarn add fluid-wallpaper@git+https://github.com/luandev/fluid-wallpaper.git
```

The consumer **must** be a Vite (or equivalent) app that compiles this package’s TypeScript and GLSL `?raw` imports. Exclude it from prebundling:

```ts
// vite.config.ts
export default defineConfig({
  optimizeDeps: { exclude: ["fluid-wallpaper"] },
  server: { fs: { allow: [".."] } },
});
```

Canvas only:

```tsx
import { FluidField } from "fluid-wallpaper";

export function App() {
  return <FluidField />;
}
```

With the tuner overlay:

```tsx
import { FluidField } from "fluid-wallpaper";

export function Tuner() {
  return <FluidField dashboard persist />;
}
```

Initial look (ignored if `persist` is on and a stored config already exists):

```tsx
<FluidField config={{ vorticity: 12, viewZoom: 1.4 }} />
```

Give the host a size. `FluidField` fills 100% of its parent (`min-height: 240px`).

| Prop | Default | Meaning |
| --- | --- | --- |
| `config` | hard-mix defaults | Initial **base** look |
| `dashboard` | `false` | Mount the artist panel |
| `perf` | `false` | Mount the perf HUD |
| `persist` | `false` | Read/write wallpaper `localStorage` |
| `onEngine` | — | Running `Engine` after start |
| `onError` | — | WebGL2 / init failure |

`config` is applied **once** on mount. Later edits go through `engine.applyConfig` or the dashboard.

## Vanilla Engine

No React:

```ts
import { Engine } from "fluid-wallpaper/engine";
import { defaultConfig, sanitizeConfig } from "fluid-wallpaper/config";

const canvas = document.querySelector("#view");
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("Missing canvas");
}
const engine = new Engine(canvas, sanitizeConfig(defaultConfig));
engine.start();
```

This repo’s landing and tuner use that path (`src/landing/main.ts`, `src/main.ts`).

## Wallpaper Engine

Later. Import **`dist/play.html`** from a production `yarn build`, not the Git tree. `dist/index.html` is the public landing; `dist/embed.html` is the React usage demo. User properties stay Phase 4.

## CI

`.github/workflows/pages.yml` runs `yarn test` and `yarn build`, then checks that `dist/` contains `index.html`, `play.html`, and `embed.html`. Pull requests do not deploy.
