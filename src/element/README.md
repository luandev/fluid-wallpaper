# Native element

`FluidInkElement` provides the first framework-neutral `<fluid-ink>` host around the existing Engine. It owns a shadow DOM canvas, pause/resume state, quality presets, config patches, injection commands, fallback text, and lifecycle disposal. `defineFluidInk()` registers the element explicitly.

The default accepts `FluidConfig` patches and uses legacy transport/display. Assigning `scene` opts into the experimental two-phase model. `updateScene` preserves fields and rejects changed pigment identities/carriers; `qualityStatus` reports choices and timing, and `scenechange` reports edits. See [two-liquid contract and limits](../../docs/TWO_LIQUID.md). The full physical/mobile plan is not complete.

```ts
import { defineFluidInk } from "fluid-wallpaper/element";

defineFluidInk();
```

Public methods are `play()`, `pause()`, `reset()`, `inject({ position, velocity })`, `setConfig(patch)`, and `getConfig()`. Supported attributes are `paused` and `quality="auto|eco|balanced|high"`; `interaction` is reserved for the future scoped interaction policy. Events are `ready`, `configchange`, `qualitychange`, and `error`.

Do not add global storage, shortcuts, dashboard portals, or media permissions here. SSR may import the module, but constructing an element requires a browser DOM. The root development package stays private. The release build emits a public preview package with compiled `/element` and auto-registering `/element/auto` entries; see [release status](../../docs/RELEASE.md).

`quality="eco"` is adaptive for both models. Legacy qualityStatus now exposes EcoStatus (including effective grids, FPS and speed), and qualitychange reports adaptation. The constructor applies ECO before the first allocation. See [ECO.md](../../docs/ECO.md).

The host backing is transparent so straight canvas alpha can reveal surrounding DOM. Established config now includes backgroundMode="transparent"; two-liquid scenes retain their opaque substrate.
