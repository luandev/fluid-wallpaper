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

### DEC-005 — Packed material concentrations and 2.5D look

- **Status:** Accepted
- **Date:** 2026-08-17
- **Context:** The Phase 1 dye field stored RGB pigment and a two-primary display grade. Artists need N colors with independent look (glow, sheen, roughness, metal) and several inject sources. A true multi-phase viscosity solver would bake appearance into transport and roughly double GPU cost per extra field. The open visual-state question asked how many independent pigment fields are useful before bandwidth dominates.
- **Decision:** Keep one Stam velocity field. Store up to four material concentrations in the existing `RGBA16F` dye target (same bandwidth as today). Emitters (field, point, pointer; cap 8) write those channels. Display reconstructs a cheap 2.5D material response (gradient normals, Lambert, small GGX-like spec, Fresnel sheen, emissive glow). Viscosity is a derived thickness cue: extra velocity damping `exp(-(velocityDecay + Σ cᵢ·viscᵢ)·dt)` where the material is dense. Simulation still does not choose the painted look ([DEC-002](#dec-002--separate-simulation-from-appearance)).
- **Alternatives:** RGB dye with look-only materials and one global viscosity; true multi-fluid / N velocity fields; a second dye texture for eight materials.
- **Consequences:** Four simultaneous identities at current dye cost. Slight sim coupling through concentration-weighted damping, documented rather than silent. Eight materials would need another dye target and advect pass. Tuner lists (materials, emitters) live beside the flat `controlSchema`, not as flattened keys.
- **Evidence:** `docs/ARCHITECTURE.md`; `src/app/config.ts` material/emitter caps; inject, viscosity-weight, and display passes.
- **Review trigger:** Four packed channels visibly alias when mixed, or the weighted damping is too weak/strong to read as thickness.

### DEC-006 — React product-shell dashboard and value drivers

- **Status:** Accepted
- **Date:** 2026-08-17
- **Context:** The vanilla tuner became a long stack of nested cards. Artists need to see and bind what they are changing, including LFOs that drive any numeric knob. Mic, camera, and tilt belong to later optional inputs (Phase 5) and must not be required for a complete look.
- **Decision:** Use React only for the product-shell dashboard overlay (`src/ui`). Simulation, shaders, and `Engine` stay TypeScript. Numeric **value emitters** (sine, triangle, saw, square, noise) map a wave in `[0,1]` onto `[from, to]` and mix into **base** config via bindings. Mic, camera, and tilt exist as stub kinds that sample `0.5` and request no permissions. Storage and presets save **base** config plus the driver graph, never 60fps live values.
- **Alternatives:** Keep and restyle the vanilla tuner; add a heavier UI kit; wire real getUserMedia in this pass.
- **Consequences:** Yarn installs `react` / `react-dom`. The artwork still runs with the panel closed and with an empty driver list. Real sensor adapters can later replace stub `sample()` without touching the solver.
- **Evidence:** `src/ui/Dashboard.tsx`; `src/app/drivers.ts`; `src/app/engine.ts` base vs live split.
- **Review trigger:** React overlay cost is visible on the target Wallpaper Engine CEF class, or artists need to bind colors / reseed keys.
