# Decision log

Record durable decisions here. Do not record an option as decided until its evidence and tradeoffs have been reviewed.

## Template

### DEC-000 — Short title

- **Status:** Proposed | Accepted | Superseded
- **Date:** YYYY-MM-DD
- **Context:** What problem requires a decision?
- **Decision:** What was chosen?
- **Alternatives:** What credible options were considered?
- **Consequences:** What becomes easier, harder, or constrained?
- **Evidence:** Links to primary sources, experiments, and relevant issues.
- **Review trigger:** What new fact would justify revisiting this?

## Current decisions

### DEC-001 — Documentation-first foundation

- **Status:** Accepted
- **Date:** 2026-08-14
- **Context:** The product direction is defined, but platform and implementation questions remain open.
- **Decision:** Begin with a documentation-only structure and issue-driven research before adding code or build tooling.
- **Alternatives:** Scaffold an implementation stack immediately.
- **Consequences:** Early work remains portable and reviewable; implementation begins later.
- **Evidence:** `docs/PROJECT.md` and `docs/OPEN_QUESTIONS.md`.
- **Review trigger:** The Phase 0 research issues establish enough evidence to select an initial stack. Resolved by [DEC-003](#dec-003--typescript-vite-webgl2-and-glsl).

### DEC-002 — Separate simulation from appearance

- **Status:** Accepted
- **Date:** 2026-08-14
- **Context:** One evolving field should support multiple material identities.
- **Decision:** Keep simulation state and transport separate from material rendering.
- **Alternatives:** Encode each material directly in the simulation.
- **Consequences:** Materials can evolve independently, while interfaces between the layers must remain clear.
- **Evidence:** `docs/ARCHITECTURE.md`.
- **Review trigger:** A validated technique requires tighter coupling and documents why it is worth the tradeoff.

### DEC-003 — TypeScript, Vite, WebGL2, and GLSL

- **Status:** Accepted
- **Date:** 2026-08-14
- **Context:** Phase 0–1 needs a concrete, browser-testable GPU stack. Wallpaper Engine web wallpapers execute local HTML/CSS/JS only, so the build must produce a static bundle with relative URLs. The solver should follow the Stam / GPU Gems ch. 38 family of methods, implemented originally rather than copied from any demo.
- **Decision:** Use TypeScript for application logic, Vite as the dev server and bundler (`base: './'`), WebGL2 with GLSL ES 3.00 for simulation and display, and Vitest for CPU-only utility tests. Prefer `RGBA16F` simulation targets with runtime capability detection; never silently store velocity or pressure in 8-bit textures. WebGPU stays deferred to Phase 6. Wallpaper Engine will later consume `dist/`, not the Git working tree.
- **Alternatives:** Unity; raw JavaScript without a bundler; WebGL1; WebGPU as the first path; copying Pavel Dobryakov’s WebGL fluid source as the project base.
- **Consequences:** The engine can be iterated in a browser with shader reload. Wallpaper Engine packaging is a later copy of the production build. Target GPUs must support WebGL2 and floating-point (or half-float) render targets. Shader code is original and modular, which keeps simulation and appearance separable (DEC-002).
- **Evidence:** Project definition (web GPU application, Vite, WebGL2); [Wallpaper Engine web wallpaper guide](https://docs.wallpaperengine.io/en/web/first/gettingstarted.html); [GPU Gems ch. 38](https://developer.nvidia.com/gpugems/gpugems/part-vi-beyond-triangles/chapter-38-fast-fluid-dynamics-simulation-gpu); Pavel Dobryakov’s demo as a quality baseline only.
- **Review trigger:** Wallpaper Engine’s CEF build cannot run WebGL2, or floating-point render targets are unavailable on a required GPU class.

### DEC-004 — Yarn only

- **Status:** Accepted
- **Date:** 2026-08-14
- **Context:** The Phase 0–1 app was bootstrapped with npm. Two lockfiles and mixed install commands would drift dependency trees.
- **Decision:** Yarn Classic (1.22) is the only package manager. `packageManager` pins `yarn@1.22.22`. `engines.npm` is set to `please-use-yarn` with `.npmrc` `engine-strict=true`. `preinstall` runs `scripts/ensure-yarn.js` so npm/pnpm/bun installs fail. `package-lock.json` is gitignored.
- **Alternatives:** Keep npm; allow both npm and Yarn; Yarn Berry (2+).
- **Consequences:** Contributors run `yarn`, `yarn test`, and `yarn build`. npm install is rejected. Corepack can satisfy the pinned Yarn version.
- **Evidence:** `package.json` `packageManager` / `engines`; `.npmrc`; `scripts/ensure-yarn.js`.
- **Review trigger:** The project moves to Yarn Berry or a workspace that Corepack cannot pin.
