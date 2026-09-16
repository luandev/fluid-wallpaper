# Using the fluid field

Ways to run this wallpaper. The solver is always `Engine` in TypeScript; React never steps it ([DEC-006](DECISIONS.md), [DEC-008](DECISIONS.md)).

## Landing page

Full-viewport field with editorial chrome. No dashboard.

- Dev: `yarn dev` → `index.html`
- Live: [luandev.github.io/fluid-wallpaper](https://luandev.github.io/fluid-wallpaper/)
- Boot: `src/landing/main.ts` → `new Engine(canvas, createLandingConfig(sceneId))`

The landing randomly chooses Aurora, Gilded Obsidian or Porcelain Tide. Its scene picker and `?scene=aurora|obsidian|porcelain` links allow direct selection. Saved tuner settings do not affect these curated scenes. See [the collection](../src/landing/README.md#the-scene-collection).

Pointer still stirs the field. **H / P / F** do nothing here.

## Tuner

Artist dashboard, perf HUD, spatial UV markers.

- Dev: `/play.html`
- Live: [play.html](https://luandev.github.io/fluid-wallpaper/play.html)
- Boot: `src/main.ts` → Engine + `mountDashboard` + `mountPerfHud`

**H** panel, **P** perf, **F** canvas fullscreen, **Esc** exit. Base config persists in `localStorage` (`fluid-wallpaper.config.v9`). Default look includes a YouTube music video behind the ink ([this track](https://www.youtube.com/watch?v=wKEeVPfK8nw)) and example audio drivers. Play the track, then Drivers → Listen → **Tab audio** (share this tab) or a mic loopback. The iframe cannot feed the analyser. Landing never mounts the player.

## React embed demo

Same `FluidField` host the package exports, with a switch for canvas-only vs dashboard.

- Dev: `/embed.html`
- Live: [embed.html](https://luandev.github.io/fluid-wallpaper/embed.html)
- Boot: `src/react/embed.tsx`

This page uses `persist={false}` so base configuration does not share the tuner store. Dashboard preset operations, panel positions, and perf preferences still use shared storage. Full instance isolation remains a release follow-up.

## React component

Install the published preview from npm:

```bash
npm install fluid-wallpaper@next react@^19 react-dom@^19
# or: yarn add fluid-wallpaper@next react@^19 react-dom@^19
```

Current pin: `fluid-wallpaper@0.1.0-next.0` (also on the `latest` and `next` dist-tags for this first release). Import `fluid-wallpaper/styles.css` once in your app. Both `fluid-wallpaper` and `fluid-wallpaper/react` export `FluidField`. JavaScript and TypeScript declarations are compiled; no GLSL loader or Vite workaround is required. See the [integration guide](../usage.html), [public docs](index.html), and [release mechanism](RELEASE.md).

For plain HTML without a bundler:

```html
<script
  type="module"
  src="https://cdn.jsdelivr.net/npm/fluid-wallpaper@0.1.0-next.0/element-auto.js"
></script>
```

The GitHub Pages docs site and web-component playground load that same published build from jsDelivr. Technique notes: [shaders.html](shaders.html) · [SHADERS.md](SHADERS.md).

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

| Prop        | Default           | Meaning                             |
| ----------- | ----------------- | ----------------------------------- |
| `config`    | hard-mix defaults | Initial **base** look               |
| `dashboard` | `false`           | Mount the artist panel              |
| `perf`      | `false`           | Mount the perf HUD                  |
| `persist`   | `false`           | Read/write wallpaper `localStorage` |
| `onEngine`  | —                 | Running `Engine` after start        |
| `onError`   | —                 | WebGL2 / init failure               |

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
<script
  type="module"
  src="https://cdn.jsdelivr.net/npm/fluid-wallpaper@0.1.0-next.0/element-auto.js"
></script>
```

The CDN URL becomes available after publication. Modules support import without a DOM; construct/mount components only in the browser. Use a client boundary in server-component frameworks. The element has shadow styles; React requires the exported CSS. WebGL2 failure exposes fallback content. No mobile-device certification or full dashboard instance-isolation guarantee is claimed.

## Backgrounds

On the tuner, **Scene > Background** selects **Music video**, **Solid color**, or **Gradient**. Color pickers edit the solid color or both ends of a diagonal gradient. Changes persist with presets and do not reseed. Older presets without a background selection migrate to video with empty-ink transparency.

Music video fills the area behind the canvas. Use **Play / control music** to route clicks to the player, then **Return to fluid** to stir again. Video requests muted autoplay; enabling sound is user initiated; the iframe cannot feed the audio analyzer directly. Solid/gradient modes retain a compact player. Fullscreen includes the video layer. Landing scenes use gradients without mounting a player.

Solid and gradient backgrounds also work in native and React component configs:

```js
field.config = {
  backgroundMode: "gradient",
  backgroundColor: "#101827",
  backgroundColorB: "#59355f",
};
```

The established renderer composites colors in its existing stylized RGB display pass with opaque output. Video mode uses `videoReveal` (0-1, default 1) to expose a host-provided layer through empty ink. The tuner/dashboard provides YouTube; dashboard-free embeds do not create media automatically. The experimental two-liquid renderer continues to use its opaque substrate.

Browser checks verify shader colors/alpha and tuner placement/control routing with external media blocked. Actual YouTube availability/playback and mobile appearance require interactive checks.

## Adaptive ECO

`quality="eco"` progressively lowers effective resolution, frame rate and simulation speed under sustained load, then recovers slowly. Authored settings remain unchanged. See [ECO policy and evidence](ECO.md).

## Public docs and fluid hero

The browser documentation starts at [docs/index.html](index.html), with [all settings](settings.html), [hero integration](hero.html), [gallery](gallery.html), [shaders & technique](shaders.html) and [preset contributions](contributing-presets.html). `usage.html` remains a compatibility link.

```js
import { defineFluidHero } from "fluid-wallpaper/hero";
import { getFluidPreset } from "fluid-wallpaper/presets";
defineFluidHero();
const hero = document.querySelector("fluid-hero");
// Preferred: hand-authored or gallery config
hero.config = {
  ...getFluidPreset("aurora"),
  backgroundMode: "transparent",
};
// Optional shortcut: <fluid-hero preset="aurora"> still works; config patches override it.
```

`fluid-wallpaper/hero/auto` registers the element; plain HTML can use the published `hero-auto.js` URL. React exports `FluidHero` with children, preset/config/quality/paused/interactive, className/style and onReady/onError/onConfigChange/onQualityChange callbacks receiving CustomEvent. Unlike the existing FluidField's initial-only config, hero config updates are reactive. Prefer assigning `config` for page heroes; `preset` remains a convenient starting point and config overrides it. Changing materials/flow identity starts a fresh composition. Native methods are play(), pause(), reset(); qualityStatus is a readout.

Docs page heroes use hand-authored configs. Gallery cards load a full preset config into both the page hero and the live preview. Adaptive ECO, decorative pointer handling and scoped shadow styles remain the defaults when those fields are omitted. Optional `glass` adds a frosted content panel (`backdrop-filter`) for readability; optional `blur` softens the fluid artwork while keeping copy sharp. Tune with `--fluid-hero-glass-blur`, `--fluid-hero-glass-fill`, `--fluid-hero-blur`. Foreground content is caller-owned. CSS variables: --fluid-hero-height, --fluid-hero-radius, --fluid-hero-content-width, --fluid-hero-overlay. Hidden/offscreen heroes pause; reduced motion shows a static background and explicit Play animation. Disconnection disposes the field. Native hero imports do not require React and module imports are SSR-safe.

Transparent is a fourth background mode, available in the tuner and all established-renderer components. Empty pigment has zero alpha; sparse pigment is translucent. It ignores videoReveal, creates no media, and does not pass pointer events through automatically. Use pointer-events:none for a decorative overlay over clickable content. Transparent heroes have no default scrim or colored fallback; caller-supplied styles remain caller-owned.

Music video now requests muted autoplay on load/selection. Enable sound is explicit; Play video and native iframe controls remain available when autoplay is blocked. Solid/gradient/transparent modes do not initiate playback. Existing playing music remains optional and independent of capture. The official [YouTube iframe API](https://developers.google.com/youtube/iframe_api_reference) controls sound and reports playback; availability and autoplay permission depend on the host/browser.
