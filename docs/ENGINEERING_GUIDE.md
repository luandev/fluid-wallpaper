# Engineering guide

For the opt-in equal-density two-liquid path, read [TWO_LIQUID.md](TWO_LIQUID.md): field units, donor fluxes, stress/projection residuals, optics, adaptive limits, GPU fixture and measured results. The legacy findings below remain applicable to `FluidConfig`/`Engine`; they do not describe the new scene path. The full implementation plan is not yet accepted as complete.

This is practical know-how for the **current working tree**, last checked 2026-09-09. It records implementation behavior, not proof of GPU correctness or release readiness. Update affected sections when their code changes; keep rationale in [DECISIONS.md](DECISIONS.md) and unresolved alternatives in [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md).

## Runtime and data flow

Entry points are [tuner](../src/main.ts), [landing](../src/landing/main.ts), and [React embed](../src/react/embed.tsx). Each eventually starts [Engine](../src/app/engine.ts); React never steps the solver.

The incremental native host is [src/element](../src/element/README.md). It wraps Engine with shadow-DOM lifecycle and does not yet replace the legacy FluidConfig with the planned two-phase scene schema.

1. Input configuration is cloned/clamped/asserted. Storage/import use sanitization.
2. Base config is authored intent. Drivers derive live config; the engine preserves the solver's live object identity while replacing its values.
3. Each engine tick samples optional audio, accumulates elapsed time, runs a bounded number of fixed simulation steps, evaluates drivers, consumes pointer input, and displays dye. Excess lag is capped rather than converted into unlimited catch-up work.
4. Display receives concentration texture plus live material look values. Base config and the driver graph are persistable; FFT, per-frame values, and GPU textures are not.
5. Browser visibility stops/restarts RAF. Resize changes the canvas; changed simulation aspect may rebuild/reseed.
6. Successful dispose releases most engine-owned resources/listeners. Failure-path cleanup, context recovery, and geometry-buffer ownership need follow-up.

These are current paths, not a prescription to preserve the reviewed defects below. [ARCHITECTURE.md](ARCHITECTURE.md) describes the intended module boundaries.

## Field and control semantics

| State/control | Current meaning |
| --- | --- |
| Velocity | One shared vector field; advection converts grid displacement to UV using inverse simulation size |
| Pressure/divergence/curl | Derived simulation fields; allocated with the selected simulation texture format |
| Dye RGBA | Up to four material concentrations, not display RGBA |
| Material ID | UI/config identity; GPU slot currently follows material array position |
| Material viscosity | Concentration-weighted exponential velocity damping; not a true viscosity diffusion solve |
| Contrast | Exponent controlling normalized material weights in display |
| Noise time | Current legacy motion multiplier for simulation dt and elapsed time; fixed-step accumulation now bounds frame variance |
| View zoom | Procedural composer/seed scale; not a display camera transform |
| Source rate | Point dose and field approach are now scaled by elapsed seconds in the shader; source rates remain legacy config values pending unit migration |
| Source radius | Gaussian squared-distance denominator in the shader; UI ring uses a different transform |
| Frame ms/FPS | RAF interval and smoothed rate; not GPU elapsed time |

The current step order is pointer splats → composer/wind → injection → vorticity → local damping → velocity advection → projection → dye advection. This is the first correction slice; divergence and visual behavior still require GPU validation.

`Engine.pause()`, `resume()`, and `inject()` now provide the first host lifecycle/command seam. The native [fluid-ink element](../src/element/README.md) wraps it, but it still uses the legacy FluidConfig and renderer.

Current caps and ranges are owned by [config.ts](../src/app/config.ts), not this guide. Defaults and assertions must be read there before experiments. In particular, review quality candidates below the current pressure-iteration assertion cannot simply be passed to the current engine.

## Recipe: add or change a control

1. Define the artist-visible effect, units, default, range, and whether the change needs uniforms, CPU data, GPU reallocation, or a reset. Avoid adding a slider with no demonstrable effect.
2. Update the config type/default/clone/merge/sanitize/assert path in [config.ts](../src/app/config.ts). Array items need stable IDs, cap handling, and reference cleanup.
3. Update scalar `controlSchema` or the relevant material/emitter/wind/driver field definitions and [field help](../src/app/fieldHelp.ts). Use the existing UI commit interfaces.
4. Decide whether automation is safe. Keep rebuild/reseed settings outside bindable paths. Graph ports and form options must agree with the same registry.
5. Wire the consumer: engine/solver uniform/display/input. A value in saved config alone does not implement behavior.
6. Update meaningful CPU boundary/migration tests and usage/local docs. For optical/spatial changes, also record actual visual verification or its absence.

Current warning: `Engine.applyConfig` updates values but does not own every required resource rebuild. Dashboard callers supply a separate reseed flag. Do not advertise arbitrary runtime resolution patches as already complete.

## Recipe: change a shader or transport pass

Read the shader with [sources.ts](../src/shaders/sources.ts), [programs.ts](../src/sim/programs.ts), and its solver/display caller. Update the source catalog, include markers, uniform names/array sizes, texture units, target sizes, and cleanup together.

Document field units, sampling/filtering, dt scaling, boundaries, nonnegative concentration handling, and place in the pass sequence. Never sample the attachment being written; preserve ping-pong read/write ownership. Additional fields/passes need a cost estimate and a decision if they expand the accepted four-channel model.

Use original implementations of referenced techniques. Record source/author/license for any external code or data before reuse; a familiar algorithm name is not permission to copy source. CPU shade helpers are a reference for selected math, not execution of GLSL.

For future GPU validation, compare a fixed recipe/seed and elapsed time, divergence, concentration drift, nonfinite values, and visual detail. Such tests require a scoped follow-up because today's test suite is CPU-only.

## Recipe: change drivers or optional inputs

Driver evaluation maps a source into a bounded numeric target. The last binding per path wins. `amount` mixes base and driven values; source `scale` changes amplitude around the midpoint. Schema validation, form labels, graph ports, and evaluation must remain consistent.

Waves and optional audio use the same driver graph. Camera/tilt are stubs. Microphone/tab capture starts only through the explicit Listen interaction, and errors/stopped tracks must leave a silent bounded frame. No optional input may become a prerequisite for a useful scene.

Pointer coordinates use bottom-origin UVs. The current pointer adapter keeps the last movement delta rather than an accumulated path; input work must examine multiple events between frames and pointer-up/cancel handling. Spatial editing must not stir the field underneath it.

Current default traps: base `noiseTime` is zero and an enabled triangle driver supplies motion; removing that driver can freeze the autonomous default. Bass drives `dyeInject`, which does not affect current point-source injection. Kick drives pointer force and therefore needs pointer motion. These are limitations, not useful examples to replicate.

## Persistence and migrations

| Data | Owner | Current scope |
| --- | --- | --- |
| Base config | [storage.ts](../src/app/storage.ts) | v9 key, v8 read fallback; sanitizes loaded data |
| Preset library/document | [presets.ts](../src/app/presets.ts) | Shared localStorage library; portable document kind `fluid-wallpaper.preset.v1`; import merges by name |
| Panel positions | [panelLayout.ts](../src/app/panelLayout.ts), [dragPanel.ts](../src/app/dragPanel.ts) | Shared chrome storage, separate from look data |
| Perf preference | [perfHud.ts](../src/app/perfHud.ts) | Shared HUD preference |
| Live data | Engine/inputs | Not persisted |

Changing a field's units while retaining the same stored value changes old scenes. Define migration behavior and tests before changing semantics. Unknown/invalid input goes through sanitization; document kind and config-storage version serve different purposes.

`persist={false}` currently suppresses base-config persistence through the React/dashboard path. It does **not** isolate preset operations, panel storage, or perf preferences. Storage writes can fail; do not couple failure handling to simulation shutdown. Future complete instance isolation is proposed, not implemented.

## Performance investigation

Reproduce separately with the dashboard closed/open and with stored/default config. Capture device/browser, CSS size/DPR, aspect, formats/filtering, grids, active sources/drivers, ready time, frame distribution, and duration. Separate startup/reseed stalls from steady-state rendering and UI activity.

Cost sources include portrait-expanded short-side grids, many Jacobi passes, procedural force/injection noise, display sampling, synchronous warmup/readback, per-frame config/typed-array allocations, and frequent React telemetry. Shader invocation or memory calculations are estimates; only device traces support performance claims.

The fixed [quality helper](../src/quality/budgets.ts) is not connected as an adaptive governor. Proposed policies in the review need device evidence, hysteresis, clear overload behavior, and state-preserving resize. Lowering frame rate before fixing per-frame injection changes the mixture.

## Known findings and their owners

These findings remain open as of this guide's date. Full reasoning and source links: [ink/component review](REVIEW_INK_COMPONENT.md#priority-findings). Resolve each with code and appropriate evidence, then update this table rather than leaving stale warnings.

| Finding | Primary owners | Evidence needed for resolution |
| --- | --- | --- |
| Frame-dependent injection and inconsistent global injection knob | sim/solver, shaders/perlinDye | **Implementation slice landed:** elapsed-time scaling; equal-time GPU dose and source-kind behavior still need validation |
| Normalized RGB mixing hides dilution; color space is implicit | render, shaders/display, app/colors/shade | Dilution/mixture swatches and documented optical contract |
| Velocity changes after projection | sim/solver, velocity shaders | **Implementation slice landed:** projection moved after velocity advection/drag; divergence measured at the velocity used for pigment transport |
| Half-float linear filtering checks an unnecessary WebGL1 extension | sim/capabilities, display/advection | **Implementation slice landed:** WebGL2 half filtering is treated as available; format/filter probes still need device validation |
| Material array edits reinterpret existing channels | app/config, UI materials, solver/render slots | Remove/reorder/add scenarios preserve intended identities |
| Synchronous warmup/readback and aspect reseeds | app/engine, sim, platform | Startup and resize traces; no hidden hard reset claim |
| Radius marker differs from shader footprint | ui/spatial, inject/splat/wind shaders | Agreed falloff contour in portrait and landscape |
| Global overlays/shortcuts/storage escape embed scope | ui, react, app chrome, element | Element host is scoped; React/dashboard limitations remain; scrolling and independent-instance fixtures are still needed |
| Missing context restoration and partial-init cleanup | app/engine, sim/gpu, platform, react | Failure/reconnect/context-loss resource checks |
| Private source export is not a built custom element | package/Vite, react, future adapter | Actual packed-artifact consumer installation |

Do not mark these fixed because documentation exists. The dated review retains historical observations; attach a resolution note with evidence when a later change addresses them.

## Build, embedding, and release know-how

[USAGE.md](USAGE.md) owns existing recipes. The package currently exports source TypeScript from React/engine/config and needs raw GLSL bundler support. `yarn build` type-checks and bundles three HTML entry pages; it does not emit a verified native element library with declaration artifacts.

Vite `base: './'` is shared by Pages and future local-folder packaging. CI checks USAGE headings plus index/play/embed output. Keep those stable unless their owning workflow/decision changes in the same task.

Before a future package release, inspect its actual allowlist/lifecycle scripts: the current source-package allowlist omits the guard script referenced by preinstall. Validate built exports, GLSL bundling, styles, declarations, licensing, and isolated consumer fixtures. Native element name/API, package name/registry, SSR behavior, and multi-instance policy remain open.

## Validation and handoff

For implementation, use the documented `yarn test` and `yarn build`. For documentation, check local links/fragments, headings (including CI-required USAGE sections), folder coverage, terminology, and consistency with source/decisions. Do not add test dependencies for documentation.

The 2026-09-09 review environment lacked vitest and tsc, so both implementation scripts failed before running; installs were prohibited. This is dated evidence, not a permanent machine requirement. Re-evaluate tools when an implementation task resumes.

A useful handoff names the behavior changed, affected contracts/docs, checks with outcomes, outstanding findings/decisions, and the next concrete verification needed. Keep private captures, credentials, local machine paths, and generated output out of repository documentation.
