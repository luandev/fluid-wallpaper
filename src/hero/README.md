# Fluid hero

`index.ts` defines the SSR-import-safe native element; `auto.ts` registers fluid-hero. It composes fluid-ink without React, storage or media. Intersection/visibility and reduced-motion controls defer animation until needed. The default slot contains accessible user content. Preset selection is a fresh composition; config updates are diffed before the element's rebuild logic. Disconnect removes and disposes the child.

Defaults and public API are documented in [usage](../../docs/USAGE.md#public-docs-and-fluid-hero). `FluidHero` in src/react is the reactive React wrapper; existing FluidField semantics are unchanged. Tests include a bounded browser fixture and React StrictMode probe.
