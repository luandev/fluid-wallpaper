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

**H** panel, **P** perf, **F** canvas fullscreen, **Esc** exit. Base config persists in `localStorage` (`fluid-wallpaper.config.v9`). Default look includes a compact YouTube music player ([this track](https://www.youtube.com/watch?v=wKEeVPfK8nw)) and example audio drivers. Play the track, then Drivers → Listen → **Tab audio** (share this tab) or a mic loopback. The iframe cannot feed the analyser. Landing never mounts the player.

## React embed demo

Same `FluidField` host the package exports, with a switch for canvas-only vs dashboard.

- Dev: `/embed.html`
- Live: [embed.html](https://luandev.github.io/fluid-wallpaper/embed.html)
- Boot: `src/react/embed.tsx`

This page uses `persist={false}` so base configuration does not share the tuner store. Dashboard preset operations, panel positions, and perf preferences still use shared storage. Full instance isolation remains a release follow-up.

## React component

Install the compiled preview from npm after the first publication:

```bash
npm install fluid-wallpaper@next react@^19 react-dom@^19
# or: yarn add fluid-wallpaper@next react@^19 react-dom@^19
```

Import `fluid-wallpaper/styles.css` once in your app. Both `fluid-wallpaper` and `fluid-wallpaper/react` export `FluidField`. JavaScript and TypeScript declarations are compiled; no GLSL loader or Vite workaround is required. See the [integration guide](../usage.html) and [release mechanism](RELEASE.md).

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

Resolution/reseed changes also need `engine.reseed()`; `applyConfig` does not itself rebuild every GPU resource. Built-package validation and publication status are recorded in [RELEASE.md](RELEASE.md).

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

## Native element (adoption slice)

The compiled `/element` entry provides explicit registration and requires no React dependency or external stylesheet. The `/element/auto` browser module registers the default tag on import. See [the live example](../component.html).

```ts
import { defineFluidInk } from "fluid-wallpaper/element";

defineFluidInk();
```

```html
<fluid-ink quality="eco" style="display:block;height:320px"></fluid-ink>
```

The element exposes `play()`, `pause()`, `reset()`, `inject({ position, velocity })`, `setConfig(patch)`, and `getConfig()`. It emits `ready`, `configchange`, `qualitychange`, and `error`. Persistence is disabled. On the legacy path, `quality` changes resolution/iteration settings and may rebuild the solver. Assign a versioned `scene` to opt into the experimental two-liquid path; `updateScene` preserves field state, `scenechange` observes edits, and `qualityStatus` reports effective runtime choices. See [two-liquid usage, semantics and limits](TWO_LIQUID.md). The preview package bundles shaders. Physics and mobile acceptance remain separate gates.

This repo’s landing and tuner use that path (`src/landing/main.ts`, `src/main.ts`).

## Wallpaper Engine

Later. Import **`dist/play.html`** from a production `yarn build`, not the Git tree. `dist/index.html` is the public landing; `dist/embed.html` is the React usage demo. User properties stay Phase 4.

## CI

`.github/workflows/pages.yml` runs `yarn test`, `yarn build`, packed npm consumer checks and seven-page assertions. Pull requests do not deploy. Tag publication uses the separate [release workflow](RELEASE.md).

## Plain HTML and server rendering

```html
<fluid-ink quality="eco" style="height:320px"></fluid-ink>
<script type="module" src="https://cdn.jsdelivr.net/npm/fluid-wallpaper@0.1.0-next.0/element-auto.js"></script>
```

The CDN URL becomes available after publication. Modules support import without a DOM; construct/mount components only in the browser. Use a client boundary in server-component frameworks. The element has shadow styles; React requires the exported CSS. WebGL2 failure exposes fallback content. No mobile-device certification or full dashboard instance-isolation guarantee is claimed.
