# fluid-wallpaper

Generative WebGL2 fluid artwork as a web component or React component. **Preview:** experimental two-liquid physics and mobile support are not certified.

```sh
npm install fluid-wallpaper@next
# or: yarn add fluid-wallpaper@next
```

## Web component

```js
import { defineFluidInk } from "fluid-wallpaper/element";
defineFluidInk();
```

```html
<fluid-ink quality="eco" style="height:320px">
  <p slot="fallback">This artwork needs WebGL2.</p>
</fluid-ink>
```

For plain HTML without a bundler, use the version-pinned module after that markup:

```html
<script
  type="module"
  src="https://cdn.jsdelivr.net/npm/fluid-wallpaper@0.1.0-next.0/element-auto.js"
></script>
```

No React or external stylesheet is required by the element. `defineFluidInk()` explicitly registers it; `/element/auto` registers it on import.

## React

Install React 19 and React DOM 19 in your application, then:

```tsx
import { FluidField } from "fluid-wallpaper/react";
import "fluid-wallpaper/styles.css";

export function Artwork() {
  return (
    <div style={{ height: 360 }}>
      <FluidField config={{ vorticity: 12 }} onError={console.error} />
    </div>
  );
}
```

Use `<FluidField dashboard persist={false} />` for the optional tuner. Root imports also export `FluidField`. Configuration is initial-only; subsequent changes use `onEngine` and `engine.applyConfig`. Resolution/reseed changes require `engine.reseed()`.

ES modules and TypeScript declarations are included. No custom shader loader is needed. Import JavaScript during SSR if needed, but mount/construct the artwork only in the browser; use a client component in server-component frameworks. Import CSS through your framework's supported stylesheet entry.

## Controls and limitations

Elements expose `play`, `pause`, `reset`, `inject`, `setConfig`, `getConfig`, and `ready`, `error`, `configchange`, `qualitychange` events. Set `paused` before connecting for an initially paused field. Listen for `ready` before issuing runtime commands.

The element's `scene` property opts into the experimental two-liquid solver. React retains the established single-velocity material solver. Dashboard presets and chrome can share browser storage even with `persist={false}`. No mobile performance or full instance-isolation guarantee is made.

[Live examples and usage](https://luandev.github.io/fluid-wallpaper/usage.html) · [Source and evidence](https://github.com/luandev/fluid-wallpaper) · MIT

## Fluid hero and presets

```jsx
import { FluidHero } from "fluid-wallpaper/react";
<FluidHero preset="aurora" config={{ backgroundMode: "transparent" }}>
  <h1>Your message, in motion.</h1>
</FluidHero>;
```

Or import defineFluidHero from fluid-wallpaper/hero and use <fluid-hero>. The hero owns its shadow stylesheet and defaults to adaptive ECO. Optional `glass` and `blur` attributes (React: `glass` / `blur` props) frost the content panel or soften the fluid. It pauses offscreen, respects reduced motion, and preserves foreground content without WebGL. Presets are available through fluid-wallpaper/presets: fluidPresets, getFluidPreset(id), getFluidPresetDocument(id). Returned configurations/documents are independent copies. See the [public docs](https://luandev.github.io/fluid-wallpaper/docs/index.html) for complete integration and gallery examples.
