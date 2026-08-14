# Generative Fluid Wallpaper

A GPU-driven generative wallpaper that should feel fluid, material, intricate, and alive.

## Current status

Phase 0–1 baseline: a browser-runnable WebGL2 fluid (velocity + dye, pressure projection, pointer stir) with a crimson / charcoal marble default. Materials, audio, adaptive quality, and Wallpaper Engine properties are later phases.

## North star

Create ambient desktop art that is interesting enough to watch deliberately and efficient enough to leave running.

## Develop

```bash
yarn install
yarn dev
```

Opens a full-screen canvas with an in-page tuner. Multi-scale curl-noise runs without the mouse; drag still stirs if pointer is on. Press **H** to hide the panel. Tunings persist in `localStorage`.

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
- [Architecture boundaries](docs/ARCHITECTURE.md)
- [Roadmap](docs/ROADMAP.md)
- [Open questions](docs/OPEN_QUESTIONS.md)
- [Decision log](docs/DECISIONS.md)
- [AI-assisted development](docs/AI_ASSISTED_DEVELOPMENT.md)
- [Contributing](CONTRIBUTING.md)

## Repository areas

- `docs/` — product, architecture, decisions, and research
- `src/` — TypeScript application, simulation, rendering, inputs, platform, shaders
- `tests/` — Vitest CPU utility tests
- `assets/` — project-owned visual and reference assets (not shipped in `dist/`)
