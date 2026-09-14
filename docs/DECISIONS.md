# Decision log

Record durable decisions here. Do not record an option as decided until its evidence and tradeoffs have been reviewed.

Accepted records preserve intent and history; they do not certify that implementation or validation is complete. Current limitations and follow-up recipes live in [ENGINEERING_GUIDE.md](ENGINEERING_GUIDE.md). Technical options in [REVIEW_INK_COMPONENT.md](REVIEW_INK_COMPONENT.md) remain proposals except where later decisions explicitly accept them.

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
- **Decision:** Use React only for the product-shell dashboard overlay (`src/ui`). Simulation, shaders, and `Engine` stay TypeScript. Numeric **value emitters** (sine, triangle, saw, square, noise) map a wave in `[0,1]` onto `[from, to]` and mix into **base** config via bindings. Camera and tilt exist as stub kinds that sample `0.5` and request no permissions. Audio pulse / spectrum kinds are wired in [DEC-009](#dec-009--optional-youtube-music-and-web-audio-drivers). Storage and presets save **base** config plus the driver graph, never 60fps live values.
- **Alternatives:** Keep and restyle the vanilla tuner; add a heavier UI kit; wire real getUserMedia in this pass.
- **Consequences:** Yarn installs `react` / `react-dom`. The artwork still runs with the panel closed and with an empty driver list. Real sensor adapters can later replace stub `sample()` without touching the solver.
- **Evidence:** `src/ui/Dashboard.tsx`; `src/app/drivers.ts`; `src/app/engine.ts` base vs live split.
- **Review trigger:** React overlay cost is visible on the target Wallpaper Engine CEF class, or artists need to bind colors / reseed keys.

### DEC-007 — GitHub Pages showcase

- **Status:** Accepted
- **Date:** 2026-08-18
- **Context:** The wallpaper needs a public, shareable demo. Wallpaper Engine still loads a local `dist/` folder. Vite `base` must stay `'./'` for that path and for GitHub project pages.
- **Decision:** Ship a two-page static site from `yarn build`: `index.html` is a live-fluid landing page (no React dashboard); `play.html` is the tuner. GitHub Actions deploys `dist/` to GitHub Pages. Workshop packaging remains later.
- **Alternatives:** User-site root only; `base: '/fluid-wallpaper/'` (breaks local/WE relative loads); screenshot landing with no GPU.
- **Consequences:** Visitors need WebGL2. The same origin shares `localStorage` between landing and tuner. Pages must be switched to the GitHub Actions source in repo settings once. Wallpaper Engine should load `play.html`, not the marketing landing. A third static entry, `embed.html`, is added by [DEC-008](#dec-008--react-fluidfield-embed).
- **Evidence:** `src/landing/`; `play.html`; `.github/workflows/pages.yml`; Vite `base: './'`.
- **Review trigger:** GitHub project-page URLs fail to load chunks, or the landing overlay hides the field on the target GPU class.

### DEC-008 — React FluidField embed

- **Status:** Accepted
- **Date:** 2026-08-18
- **Context:** Other React apps should mount the living field without copying shaders. The wallpaper app already uses React for the tuner. Publishing to the npm registry and Workshop packaging are still open ([OPEN_QUESTIONS.md](OPEN_QUESTIONS.md)).
- **Decision:** Export `FluidField` from `src/react` via package `exports` (source TypeScript). Ship `embed.html` as a third Vite/Pages entry that demonstrates canvas-only and dashboard hosts. Keep `private: true`. Consumers need a bundler that compiles this package and GLSL `?raw` imports (Vite). `persist` defaults off so embeds do not share the tuner `localStorage`. The solver stays in `Engine`.
- **Alternatives:** npm registry package with a prebundled IIFE; iframe-only embed of `index.html`; copy shaders into the consumer.
- **Consequences:** Git/Yarn install works; a plain script tag does not. Two WebGL2 instances on one page are not a supported recipe. `config` is initial-only; later patches use `Engine.applyConfig`.
- **Evidence:** `src/react/`; `embed.html`; `docs/USAGE.md`; package `exports`; `.github/workflows/pages.yml` usage-doc and usage-page checks.
- **Review trigger:** Consumers need a no-bundler build, or shader `?raw` cannot be compiled outside this Vite app.

### DEC-009 — Optional YouTube music and Web Audio drivers

- **Status:** Accepted
- **Date:** 2026-08-18
- **Context:** Artists want a default music example and Winamp-style pulse / log-spectrum drivers. YouTube iframe audio cannot feed `AnalyserNode` (CORS). Wallpaper Engine audio listeners remain an open platform question.
- **Decision:** Tuner/embed mounts a compact YouTube player from a sanitized video id (default `wKEeVPfK8nw`). The field stays opaque (`videoReveal` 0) unless the artist opts into a dye punch-through. Analysis is a user-armed **microphone** or **tab audio** capture feeding `audioPulse` / `audioSpectrum` value emitters. Legacy `mic` sanitizes to `audioPulse`. Camera/tilt stay stubs. Landing never mounts the player or requests media. Live FFT is not stored.
- **Alternatives:** Tap the iframe (blocked); Wallpaper Engine `wallpaperRegisterAudioListener` as the first path; auto-start getUserMedia on load.
- **Consequences:** YouTube playback and visualization can desync unless the user shares tab audio or uses a loopback mic. Permissions require a gesture. `dyeInject` max is 0.5 so bass can push pigment above the hard-mix 0.25 default.
- **Evidence:** `src/inputs/youtubeId.ts`; `src/inputs/audioMath.ts`; `src/inputs/audioAnalyser.ts`; `src/ui/YouTubePlayer.tsx`; `src/app/drivers.ts`.
- **Review trigger:** A browser allows MediaElementSource on YouTube, or Wallpaper Engine audio bins become the primary analyser.

### DEC-010 — Ink-first web component product direction

- **Status:** Accepted (product direction only)
- **Date:** 2026-09-09
- **Context:** The owner identified mobile lag and arbitrary controls, made ink/material mixing the highest priority, and stated the intention to package and release a web component. The original project definition prioritized desktop Wallpaper Engine and deferred mobile parity.
- **Decision:** Prioritize believable ink behavior, predictable controls, mobile browser performance, and a reusable web component release. Keep the accepted WebGL2 stack and existing browser/React implementation while planning that work. Wallpaper Engine and native mobile wallpaper integration remain later.
- **Alternatives:** Continue expanding the desktop material catalog first; publish the current React source export unchanged.
- **Consequences:** Mobile browser evidence and consumer/lifecycle validation become release concerns. This does not select Beer–Lambert vs Kubelka–Munk, accept a custom-element tag/API, approve a workspace split, lock quality numbers, authorize publication, or claim any proposal is implemented. DEC-008 still describes current distribution until a release implementation decision replaces it.
- **Evidence:** Owner's 2026-09-09 request to review ink mixing, mobile lag, controls, and a web component release; [source critique and proposed stages](REVIEW_INK_COMPONENT.md); [updated product definition](PROJECT.md).
- **Review trigger:** Named-device experiments, ink reference studies, or consumer requirements show that the proposed scope is unsuitable.

### DEC-011 — Layered repository context for agents

- **Status:** Accepted
- **Date:** 2026-09-09
- **Context:** The owner requested Markdown context for each folder, AGENTS.md guidance, and durable capture of decisions, know-how, and working methods. Existing READMEs covered most major folders, but instructions and phase summaries had drifted.
- **Decision:** Keep root AGENTS.md as shared guidance; add concise scoped AGENTS.md files to maintained source/documentation/configuration folders; use folder READMEs for local contracts. Maintain one context map, an engineering guide for change recipes, the decision log for rationale, and open questions for unresolved choices. Tool-specific bridge files link to this system instead of copying rules.
- **Alternatives:** One ever-growing root instruction file; duplicate full policies in every folder; tool-specific rule sets.
- **Consequences:** Agents load only relevant local context. New maintained folders need a short guide and a context-map entry; generated output, dependencies, and Git internals do not. Changes to contracts include documentation maintenance. Existing user instructions still take precedence.
- **Evidence:** Owner's 2026-09-09 documentation request; [root instructions](../AGENTS.md); [context map](CONTEXT_MAP.md); [working methods](AI_ASSISTED_DEVELOPMENT.md).
- **Review trigger:** Duplicated rules, stale local descriptions, or excessive context loading make the guidance harder to use.

### DEC-012 — Incremental runtime and correctness adoption slice

- **Status:** Accepted
- **Date:** 2026-09-10
- **Context:** The ink-first two-phase plan requires a stable runtime boundary, but replacing the legacy solver and shipping a final package in one change would make failures difficult to isolate. Several correctness findings are independent of the future phase-field model.
- **Decision:** First land a compatibility-preserving correctness slice: elapsed-time source dose, accumulated pointer movement, projection after velocity-changing operations, WebGL2 half-float filtering detection, explicit Engine pause/resume/injection methods, and an opt-in native `<fluid-ink>` host around the current Engine. Keep the existing React/Pages paths and legacy renderer working. The element accepts current `FluidConfig` patches and quality presets until the two-phase scene schema is implemented.
- **Alternatives:** Replace the solver and package layout atomically; wait to expose any runtime boundary until the physical model is complete.
- **Consequences:** The repository now has a usable native-host seam without claiming that immiscible liquid physics or a compiled public package is complete. Source injection behavior changes from frame-count based to elapsed-time based; old presets retain structure but may produce a different dose over equal real time. GPU visual validation remains required.
- **Evidence:** [Review priority findings](REVIEW_INK_COMPONENT.md#priority-findings); [engineering guide](ENGINEERING_GUIDE.md); `src/app/engine.ts`, `src/sim/solver.ts`, `src/inputs/pointer.ts`, `src/element/`.
- **Review trigger:** The two-phase solver needs a different runtime state contract, or device evidence shows the current Engine seam cannot support the required lifecycle/quality behavior.

### DEC-013 — Opt-in two-liquid scene and numerical prototype

- **Status:** Accepted architecture; implementation and acceptance incomplete
- **Date:** 2026-09-13
- **Context:** The owner explicitly requested implementation of the adaptive two-liquid plan, including equal-density phases, real viscosity, conservative transport, absorption, artistic detail and a versioned element scene API.
- **Decision:** Add an opt-in `fluid-ink.scene.v1` path with two phase definitions and four stable carrier-bound pigment slots. Preserve legacy configuration without guessing physical migrations. Separate a MAC-grid solver, absorption/surface display, scene runtime and quality policy. Use original conservative diffuse-interface fluxes, implicit viscous stress, matched projection/surface-force locations and closed free-slip walls. Select the plan's nondimensional equal-density model and linear RGB Beer–Lambert approximation; glossy relief remains explicitly artistic. Default stirring is zero pending static-drop evidence.
- **Alternatives:** Replace legacy presets in place; retain drag as viscosity; normalize colors; treat the proposed 3D theorem as a rendering method.
- **Consequences:** A source-level element and studio can exercise the new model. The implementation currently uses collocated pigment resolution, RGBA32F diagnostic readbacks and conservative CPU resize. These are prototype limitations, not completion of the requested mobile architecture. The full plan, higher quality ceilings, separate pigment grid, coordinated solver budgets, efficient reductions, recovery and device gates remain outstanding. Static-drop refinement has not met acceptance; measured evidence is recorded rather than hidden by optical effects. No publication authorized or performed.
- **Evidence:** Owner's implementation plan; [numerical contract, reference provenance and session results](TWO_LIQUID.md); scene/solver/display/runtime modules and browser fixture. CPU tests and build are separate from GPU/device acceptance.
- **Review trigger:** Static-drop/shear convergence fails; carrier transport diffuses excessively; named-device experiments cannot sustain the work/memory budgets; or consumer requirements change the source API.
