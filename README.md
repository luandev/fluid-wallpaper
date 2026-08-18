# Generative Fluid Wallpaper

A GPU-driven generative wallpaper that should feel fluid, material, intricate, and alive.

## Current status

Phase 0–1 baseline plus Phase 3 materials and a React product-shell dashboard: a browser-runnable WebGL2 fluid with packed material concentrations, multiple emitters, optional wind stations, and wave drivers for numeric knobs. Real mic/camera/tilt, adaptive quality, and Wallpaper Engine properties remain later.

## North star

Create ambient desktop art that is interesting enough to watch deliberately and efficient enough to leave running.

## Develop

```bash
yarn install
yarn dev
```

Opens a full-screen canvas with a tabbed React dashboard (Scene, Materials, Emitters, Wind, Drivers, Presets). Multi-scale curl-noise runs without the mouse; drag still stirs if pointer is on. Value emitters can tween numeric knobs with waves. Press **H** to hide the panel. Drag a panel header (or a Panel/Perf button) to reposition; overlay positions persist in `localStorage`. Tunings persist there too. Presets can be exported and imported as versioned JSON (`fluid-wallpaper.preset.v1`); import merges by name.

```bash
yarn test
yarn build
```

`yarn build` writes a static bundle to `dist/` with relative URLs (`base: './'`).

Use Yarn only. `npm install` is rejected (`engines.npm` + `preinstall`).

### Wallpaper Engine (later)

Do not import this Git repository into Wallpaper Engine (it would pull `node_modules` and source). When packaging, import `dist/index.html` from a production build. User properties and lifecycle hooks are Phase 4.

## Start here

- [Project definition](docs/PROJECT.md)
- [Architecture overview](docs/ARCHITECTURE.md) (system map)
- [Source tree](src/README.md) (folder contracts)
- [Docs index](docs/README.md)
- [Roadmap](docs/ROADMAP.md)
- [Open questions](docs/OPEN_QUESTIONS.md)
- [Decision log](docs/DECISIONS.md)
- [AI-assisted development](docs/AI_ASSISTED_DEVELOPMENT.md)
- [Contributing](CONTRIBUTING.md)

## Repository areas

- `docs/` — product, architecture, decisions, and research ([docs/README.md](docs/README.md))
- `src/` — TypeScript application, simulation, rendering, inputs, platform, shaders ([src/README.md](src/README.md))
- `tests/` — Vitest CPU utility tests ([tests/README.md](tests/README.md))
- `scripts/` — Yarn-only install guard ([scripts/README.md](scripts/README.md))
- `assets/` — project-owned visual and reference assets, not shipped in `dist/` ([assets/README.md](assets/README.md))
