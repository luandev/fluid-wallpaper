# Review: ink behavior, mobile performance, and a web component release

Date: 2026-09-09. Status: **review and proposal, not an accepted architecture change**.

Documentation follow-up: DEC-010 subsequently records the owner's ink/component product priorities; DEC-011 records layered agent context. Root phase guidance and product summaries have been reconciled. Technical proposals and source findings below remain a dated review, not evidence of implemented fixes. Current change recipes and resolution tracking live in [ENGINEERING_GUIDE.md](ENGINEERING_GUIDE.md).

## Scope and evidence

Requested outcome: critique the existing components and rendering, explain likely mobile cost and arbitrary controls, and propose an ideal repository centered on believable ink mixing and a reusable web component.

This reviews the **current working tree**, including existing uncommitted material/audio/UI changes. No runtime implementation is changed. Source inspection covers the engine, solver and GPU resources, shaders, display, configuration and drivers, inputs, React host, dashboard and its tabs/overlays, persistence, landing, build, tests, and decisions.

The acceptance criteria for this review are actionable source findings; an ink-specific transport and optical model; useful control semantics; mobile measurement and quality proposals; a component API and distribution plan; and staged validation gates. Performance estimates below are calculations from source, not device benchmarks. Visual judgments describe what the implementation produces in principle; no live browser rendering or mobile capture was inspected.

`yarn test` failed before running tests because `vitest` was unavailable. `yarn build` failed before type checking because `tsc` was unavailable. Installs are blocked by repository instructions. Existing CPU tests do not validate GPU images or mounted components, as documented in [tests/README.md](../tests/README.md).

The requested web component/mobile emphasis differs from the desktop-first non-goals in [PROJECT.md](PROJECT.md). [DEC-008](DECISIONS.md#dec-008--react-fluidfield-embed) currently accepts a private React source package. Its no-bundler review trigger now applies. The phase descriptions also disagree: AGENTS describes Phase 0–1 while README and later decisions include materials and audio. Reconcile these in a follow-up decision before implementation. Quality budgets, fallback devices, and publication remain proposals under [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md).

## Overall critique

The repository has useful foundations: original modular fluid passes, four packed concentration channels, simulation/display separation, a framework-independent solver, sanitized configuration, portable presets, and a base/live settings distinction. Preserve those investments.

The product currently exposes an experimental visual synthesizer. It has many ways to excite and shade a field, but weak guarantees about what a control means over time, across devices, or after material edits. The central improvement is a coherent **ink model with predictable behavior**. Adding more material sliders would not establish that model.

“Material” currently combines color animation, arbitrary velocity damping, surface shading, and emission. Realistic-looking ink depends first on where color enters, how it stretches and dilutes, and how concentration absorbs light. Metallic highlights are secondary to that purpose.

## Priority findings

### High: injection changes with frame rate and source kind

Evidence: [FluidSolver.step/applyInject](../src/sim/solver.ts), [perlinDye](../src/shaders/perlinDye.frag.glsl).

Each advancing frame calls injection without `dt`. Point sources add `splat * rate` per frame and ignore `uInject`; field sources interpolate toward a procedural target using `rate * uInject`. Thus point output per real second changes with frame rate, and the global injection knob has different meanings for different source kinds. At zero decay, a continuously active point source has no concentration bound. Large values also strengthen concentration-weighted drag and make the image increasingly opaque-looking rather than meaningfully richer.

The current defaults are four **point** sources, despite two names ending in “field.” The Bass driver targets `dyeInject`, so it does not increase these default point sources. The Kick driver targets pointer force and requires pointer movement to affect the fluid. These examples can appear ineffective even when audio capture works.

Change: give sources a specified amount per simulation second; use additive `source * dt`. For an optional replenishment source, use `1 - exp(-rate * dt)` as the approach fraction. Decide whether flow denotes total injected mass or peak concentration: total flow needs a normalized footprint and treatment of clipped boundary sources. Keep continuous replenishment as an explicitly named artistic mode. Test equal elapsed time at 30/60/120 render Hz.

### High: display blending does not model ink dilution

Evidence: [display.frag.glsl](../src/shaders/display.frag.glsl), [colorTween.ts](../src/app/colorTween.ts), [colors.ts](../src/app/colors.ts).

The renderer raises each concentration to a contrast-dependent power, normalizes those values, then averages RGB and surface parameters. Reducing every concentration equally preserves these normalized weights. For a single material on a flat region, its diffuse color is consequently almost independent of concentration until it approaches zero; height-related effects are separate. This deprives dilution of a convincing optical response.

“Contrast” changes the dominance of materials rather than ordinary image contrast. Hex values are normalized into RGB without explicit sRGB-to-linear conversion before shading. All four channels share velocity, so different viscosity settings cannot make independently moving liquids. This is suitable for miscible color transport, not immiscible oil/water.

Change: replace the ink appearance path with concentration-dependent absorption, described below; keep the current stylized appearance as a named legacy mode. Separate output grading from mixture composition. Maintain stable optical identities in ink presets rather than globally recoloring all existing ink with Color B.

### High: pressure projection happens before velocity-changing operations

Evidence: [solver step ordering](../src/sim/solver.ts), [viscosityWeight](../src/shaders/viscosityWeight.frag.glsl), [advection](../src/shaders/advection.frag.glsl).

The sequence is force → injection → vorticity → projection → spatially varying damping → velocity advection → dye advection. The velocity used to transport pigment can therefore regain divergence after projection. More pressure iterations cannot correct divergence introduced afterward.

Change: establish velocity advection, forces/drag or diffusion, projection, then pigment transport using the projected velocity. Measure divergence before/after projection and after the complete velocity update. Define wall/open-boundary behavior explicitly; texture clamping alone is not a documented boundary model. The method family puts projection after the other velocity operations. [GPU Gems chapter 38](https://developer.nvidia.com/gpugems/gpugems/part-vi-beyond-triangles/chapter-38-fast-fluid-dynamics-simulation-gpu).

### High: half-float filtering detection unnecessarily selects an expensive path

Evidence: [detectCaps/selectSimTextureFormat](../src/sim/capabilities.ts), [advection](../src/shaders/advection.frag.glsl), [display](../src/shaders/display.frag.glsl).

The WebGL2 renderer gates `RGBA16F` linear filtering on the WebGL1 `OES_texture_half_float_linear` extension object. Half-float filtering is core WebGL2 functionality; that extension is not required. A missing object can select NEAREST plus manual bilinear reconstruction unnecessarily. The display then makes up to twelve texture calls for its three reconstructed samples instead of three hardware-filtered samples. This is a shader fetch count, not a claimed fourfold frame-time speedup. [WebGL2 specification](https://registry.khronos.org/webgl/specs/latest/2.0/), [MDN extension documentation](https://developer.mozilla.org/en-US/docs/Web/API/OES_texture_half_float_linear).

Change: distinguish renderability from filtering for each format, preserve actual framebuffer probes, and retain a genuine fallback for `RGBA32F` when needed. The current manual path also samples velocity with plain `texture()` during dye advection, so fallback filtering is inconsistent across fields. Test that path independently.

### High: material identity is tied to array position

Evidence: [materialSlotIndex](../src/app/config.ts), [MaterialsTab removal](../src/ui/tabs/MaterialsTab.tsx), [display slot packing](../src/render/display.ts).

GPU channel identity is the index of a material in the current array. Removing a material from the middle shifts subsequent identities, while existing concentrations remain in the old channels. A subsequent addition can expose a previously occupied channel as a new material. A stable string ID in the UI does not prevent that reinterpretation.

Change: allocate stable GPU slots independently of UI order. On removal, explicitly clear or transfer that material's channel before reuse. Define whether disabling stops injection, hides deposited ink, or both; these are different actions. Test three materials, remove the middle one, then add another.

### High: desktop budgets and synchronous startup are unsuitable defaults for an embed

Evidence: [defaultConfig](../src/app/config.ts), [resolutionFor](../src/sim/gpu.ts), [warmup](../src/sim/solver.ts), [bootSolver/probeDyeStats](../src/app/engine.ts).

Defaults: simulation 512, dye 1024, 40 Jacobi iterations, 120 warmup steps. Resolution describes the shorter grid side, not a pixel-area cap. At a hypothetical 390 × 844 CSS-pixel portrait viewport, grids become approximately 512 × 1108 and 1024 × 2216. Six simulation-sized and two dye-sized RGBA16F targets occupy about **60.6 MiB** before the canvas, probes, driver overhead, and other page content. RGBA32F roughly doubles those field bytes.

With wind active and no pointer splats, an advancing step submits about **51 simulation draws plus one display draw**. The 120-step warmup can submit about **6,120 simulation draws** synchronously. Default wave bindings make simulation time nonzero even though base `noiseTime` is zero. Other settings can pause it, so this count is conditional on advancing steps.

After warmup, `readPixels` on a shaded probe requires completion of queued GPU work. It is a startup/reseed cost, not a per-frame readback. Slider-triggered reseeds and aspect-ratio changes repeat startup. A valid dark or empty composition can also fail a test based on shaded brightness.

Change: budget total pixel area, schedule initialization over frames, show a ready/fallback state, and keep numerical diagnostics separate from image brightness. Resize by resampling valid state instead of replaying warmup on every changed aspect.

### Medium: the editor performs work at animation frequency

Evidence: [Dashboard polling and commit](../src/ui/Dashboard.tsx), [applyDrivers](../src/app/drivers.ts), [display packing](../src/render/display.ts), [RangeRow](../src/ui/rows.tsx), [Perf HUD](../src/app/perfHud.ts).

An open dashboard clones live configuration and updates React state every animation frame. The engine also clones config and reconstructs driver registries; display and source packing allocate new typed arrays. Persistent slider edits write localStorage synchronously. Each numeric row installs its own Shift listeners. Expensive settings invoke reseed during slider change, not only at gesture completion.

Change: publish live editor telemetry around 8–12 Hz, subscribe only visible consumers, cache bindings until the graph changes, reuse uniform buffers, and debounce persistence. Separate cheap preview from costly apply-on-release changes. Profile before attributing all lag to React: the landing has no dashboard and retains substantial GPU cost.

### Medium: several controls describe something other than their implementation

Evidence: [controlSchema](../src/app/config.ts), [emitter shader](../src/shaders/perlinDye.frag.glsl), [radiusToPixels](../src/ui/spatial/uv.ts), [wiggleMotion](../src/app/wiggle.ts).

- “Viscosity” is local exponential drag, not momentum diffusion. It slows a region but does not provide the full shear response of thick liquid.
- “Noise time” scales the entire solver timestep and the shared elapsed clock. A driver changing that speed also changes its own future timing; at zero it can cease progressing. Disabling the default wave leaves base speed zero. The autonomous default should work with no drivers.
- “View zoom” changes procedural forcing/seeding scale and reseeds; the display samples unchanged UVs. It is not a camera crop.
- “Radius” appears in `exp(-distanceSquared / radius)`. Its one-over-e influence radius is proportional to `sqrt(radius)`, while the UI ring uses `radius * min(width,height)`. With this shader's aspect convention the pixel radius is proportional to `sqrt(radius) * height`. The ring does not predict the footprint, especially in portrait.
- `dyeSplatRadius` is retained in config but is not used by the current solver.

Change: make units and transforms explicit. Calibrate controls from reproducible demonstrations before exposing them. Migrate old presets rather than silently changing what stored numbers mean.

### High for distribution: the component still carries application assumptions

Evidence: [FluidField](../src/react/FluidField.tsx), [BrowserPlatform](../src/platform/browser.ts), [SpatialOverlay](../src/ui/spatial/SpatialOverlay.tsx), [dashboard CSS](../src/ui/dashboard.css), [PresetsTab](../src/ui/tabs/PresetsTab.tsx), [package.json](../package.json).

The export is a React component consuming source TypeScript/GLSL, not a native custom element or built library. Its cleanup on successful mount is a good start. However:

- Dashboard styling uses viewport-fixed placement; spatial markers portal to `document.body` with an overlay covering the viewport. This can intercept a host page outside the intended canvas. Marker rects update on resize/fullscreen, but not ordinary scrolling.
- Shortcuts and panel storage keys are global. `persist={false}` disables base-config writes through the dashboard but preset operations, panel positions, and perf preferences still use shared storage.
- `Engine.applyConfig` does not itself rebuild resolution-dependent resources. The dashboard supplies a separate reseed flag; a public API caller can change reported resolutions while old buffers remain allocated. External patches do not update the dashboard's base-config state through a subscription.
- There is no public pause/resume contract, element-intersection suspension, or WebGL context restoration. Document visibility is handled. The reduced-motion CSS only stops the landing marquee, not GPU animation.
- Constructor failure can leave previously allocated listeners/resources without cleanup because no instance is returned to the host. Fullscreen geometry returns only a VAO; its buffer is not retained for explicit deletion during dispose.
- Canvas `touch-action: none` is unconditional in the React host. An ambient mobile embed can block scrolling even if pointer interaction is disabled.
- The package is private, exports source, requires React, and builds three demo HTML pages. Its publish file allowlist omits `scripts/ensure-yarn.js` despite retaining a preinstall reference to that file. Inspect an actual packed artifact before trusting Git/package installation recipes.

Change: make the browser element an isolated adapter to a lifecycle-safe runtime and release a tested library artifact, as proposed below.

## Component-by-component product critique

| Component | Current rendering/use | Better purpose and interaction |
| --- | --- | --- |
| Fluid canvas/display | Full-area concentration shading, gradient height normals, fixed light, specular power, local glow, optional video alpha | First offer a recognizable ink medium: transparent fringes, dark concentrated cores, stable mixture colors, visible substrate. Keep glossy marbling as a distinct look. Current specular is a power-lobe approximation; the decision's “GGX-like” description is loose. Local brightening is not spatial bloom. |
| Engine and quality | One RAF-driven update/display cycle; fixed config budgets; quality helper is not an adaptive controller | Own lifecycle, bounded stepping, render scheduling, diagnostics, and observable automatic quality. Keep optional adapters outside the essential update. |
| React FluidField | Convenient canvas host, lazy dashboard, error callback, initial-only config | Thin optional wrapper over the same runtime/custom element. Document controlled vs initial properties and make external changes observable. |
| Scene tab | Music appears first, followed by flat technical control groups | Put medium/preset and a few visible artistic effects first. Move solver tuning into Advanced; make music an optional integration. |
| Materials tab | Repeated cards for Color/Color B, viscosity, roughness, metallic, sheen, glow | An ink palette with mixture/dilution swatches and clear Add ink/Remove ink behavior. Show opacity/absorption controls appropriate to the medium. |
| Emitters tab | Field/point/pointer cards, rate, numeric UVs and radius; spatial markers | Name sources Dropper, Brush, and Replenishment; give a footprint preview, timed pulse, flow per second, ink selector, and direct placement. Retain coordinate input for precision and keyboard use. |
| Wind tab | Sparse directional/spinning stations and global gain | Present as Flow tools: current, stirrer, vortex. Show direction and extent. “Wind station” describes an implementation/source idea more than the artist's task. |
| Drivers and graph | Waves/audio map values onto numeric paths; graph and live readouts; camera/tilt stubs | Optional Automation workspace after the static look works. Show “Swirl moves between gentle and strong every 12 seconds.” Distinguish base, effective, and automated values. Hide unavailable sensor kinds from normal workflows. Provide form controls equivalent to graph gestures. |
| Presets | Text list; save/load/import/export; load reseeds; errors often console-only | Curated visual recipes, preview image, short purpose, compatible medium version, undoable apply, visible import errors. Separate scene recipe from device quality and editor layout. |
| RangeRow/ItemCard | Dense numeric editing, Shift fine control, wheel adjustment, clipped help | Units, nonlinear mappings, reset per control, reachable full help, touch targets, and no accidental wheel changes while scrolling. Complete tab-panel associations and keyboard tab navigation. |
| SpatialOverlay | Full-page portal, draggable labels, radius rings | Contain to the instance, align on scroll, match shader math, expose keyboard nudges, and provide an explicit Place/Edit mode distinct from stirring. |
| YouTube/audio | Optional media transport and analysis; user-armed capture | Keep as a demo/adapter. A reusable ink surface should not need a player or capture instructions to demonstrate its central behavior. |
| Perf HUD | RAF interval/FPS and grid dimensions | Developer diagnostics: frame pacing, CPU submission, GPU timing where supported, passes, estimated field memory, quality changes and reasons. RAF interval is not GPU duration. |
| Landing/embed demos | Live art and installation examples, landing shares saved tuner config | Deterministic reviewed showcase recipes and realistic embed fixtures: scrolling article, small card, two independent instances, resize and unsupported GPU. |

## What believable ink mixing should mean

### Choose a first medium deliberately

Recommended first release: **a stylized two-dimensional view of miscible inks moving through water over a light substrate**. This fits one velocity field and four concentration channels. It can convey filaments, eddies, dilution, overlap, and gradual homogenization without claiming full three-dimensional plumes.

Different media require different evidence and models:

| Medium | Important behavior | Additional model |
| --- | --- | --- |
| Ink in water | Advected filaments, dilution, absorbing overlap | Existing concentration transport plus improved injection/advection and absorption optics |
| Ink/watercolor on paper | Wet fronts, staining, drying edges, granulation | Wetness and deposited pigment, substrate transport, drying/deposition rules |
| Opaque paint | Reflective pigment mixtures and thickness | Scattering/absorption model, potential momentum diffusion and surface model |
| Oil/water marbling | Persistent separation and interfaces | Phase/interface dynamics; one shared miscible concentration model is insufficient |

Do not promise all four behind a single “material” dropdown in the first release. Curtis et al. model watercolor using shallow water, pigment effects, and Kubelka–Munk optical compositing; paper behavior is more than adding a texture to transported RGB. [Computer-Generated Watercolor](https://grail.cs.washington.edu/projects/watercolor/paper_small.pdf).

### Transport: preserve identity and make motion causal

Use four nonnegative concentration fields `c_i` and a shared velocity `u`. The conceptual model is:

```text
dc_i/dt + u · gradient(c_i) = D_i laplacian(c_i) + source_i - removal_i
```

Sources add known amounts. Stirring stretches and folds color already present. Explicit, bounded diffusion controls physical mixing; numerical blur from semi-Lagrangian interpolation must be measured separately. Avoid forcing the entire field toward a new noise-colored target in the ink preset. The existing field-source mode can remain for perpetually replenished marbling.

Start with corrected first-order transport at affordable resolution. Then compare a clamped MacCormack/BFECC-style dye transport experiment against the baseline: more passes may preserve filaments at lower resolution, but this is not automatically a mobile optimization. Enforce nonnegativity and prevent new extrema from correction; measure concentration drift and edge retention. Upgrade only after a visual/cost comparison. Higher-order advection is discussed in [GPU Gems 3 chapter 30](https://developer.nvidia.com/gpugems/gpugems3/part-v-physics-simulation/chapter-30-real-time-simulation-and-rendering-3d-fluids).

For the initial ambient model, retain drag under its honest name. If true viscosity is later required, solve momentum diffusion with documented boundary and stability behavior; concentration-weighted drag is not an interchangeable substitute. Additional wetness/deposition fields need their own cost justification under DEC-005.

A closed box with endless sources must eventually saturate or mix toward uniformity. Design longevity deliberately: sparse timed injections, a documented gentle washout, or a replenished/open reservoir mode. “Alive indefinitely” is an artistic source/sink policy, not an automatic property of the solver. Make finite mixing and ambient replenishment separate recipes.

### Optics: concentration must change the light

For the first transparent-ink prototype, calculate RGB optical depth as an explicitly approximate model:

```text
tau = pathLength * sum(concentration_i * absorptionRGB_i)
transmittance = exp(-tau)
linearColor = substrateLinearRGB * transmittance
output = linearToSRGB(linearColor)
```

This applies Beer–Lambert attenuation: more ink absorbs more light; dilution approaches the substrate; overlapping inks combine absorption. A three-channel, homogeneous-path model cannot reproduce all spectral color mixtures or volumetric scattering. Arbitrary RGB swatches do not uniquely determine real ink absorption spectra. Use calibrated artistic coefficients with a documented reference concentration first; add spectral data only if measured improvement warrants it. [PBRT: Transmittance](https://pbr-book.org/4ed/Volume_Scattering/Transmittance).

Render against a known substrate inside the canvas for this first experiment. Ordinary scalar canvas alpha over arbitrary DOM content cannot encode different transmittance for each color channel exactly. Expose a clear opaque/transparent compositing contract; do not equate video punch-through with colored optical transmission.

Use a separate Kubelka–Munk experiment for scattering pigments/paint, with measured or artist-calibrated absorption/scattering coefficients and a defined substrate/layer model. A single hex color is insufficient physical input. Compare mixture swatches and finite-thickness behavior before adding this to the main renderer. [Computer-Generated Watercolor](https://grail.cs.washington.edu/projects/watercolor/paper_small.pdf).

Keep the first ink shader inexpensive: stable color conversion, concentration absorption, and a small amount of justified surface response. Height from total dye is not actual water surface height; a dense dye plume need not look embossed. Lighting should support the chosen medium, not determine its identity.

### Visual acceptance scenes

1. One drop in still clear water: dark center, transparent outskirts, gradual controlled spreading.
2. Two calibrated inks brought together: continuous optical mixture through changing ratios; compare 25/50/75% swatches against selected references. Do not assume any two RGB “yellow/blue” values must make a specific green.
3. A brush dragged through an existing drop: continuous stretched filaments, no unrelated global recoloring. Accumulate pointer motion across events; the current input retains only the latest event delta and can drop the final movement on pointer-up.
4. No sources, no removal: track concentration drift and divergence through transport; set measured tolerances per quality tier, not exact bitwise conservation claims.
5. Same seeded recipe and simulated time at 30/60/120 render Hz: comparable dose, motion distance, dilution, and palette.
6. Ten-minute ambient scene: evolving composition without hidden hard resets, unbounded concentration growth, or one uniform saturated field.

## Controls designed around artistic intent

The default editor should expose a small set of effects the artist can predict. Suggested first screen: Medium, Ink palette, Ink amount, Flow speed, Swirl size, Mixing, and Quality. Sources remain directly editable on the artwork. Reveal the full schema in Advanced.

| Artist control | Defined effect | Implementation direction |
| --- | --- | --- |
| Ink palette | Optical identity of deposited inks | Stable slots plus absorption coefficients; show pairwise mixture and dilution swatches |
| Ink amount | How much arrives | Normalized source dose per second, independent of display refresh |
| Dilution | Less colorant per injected volume | Separate source concentration from source flow; don't simply relabel global dye deletion |
| Flow speed | Motion in domain lengths per second | Velocity units independent of grid resolution; keep automation on its own clock |
| Swirl size | Width of dominant curls | Calibrated spatial scale with a viewport-relative preview |
| Turbulence | Amount of small-scale stirring | Bounded forcing/confinement recipe, not an unspecified multiplier stack |
| Mixing | How quickly concentration gradients soften | Measured diffusion parameter, independent of display contrast |
| Drag | How quickly stirring settles | Exponential momentum decay with a meaningful settling-time display |
| Brush size | Visible footprint | Defined falloff radius in CSS pixels or fraction of domain; renderer and marker use the same transform |
| Persistence | How long ambient ink remains | Explicit washout half-life; infinity is allowed for finite scenes |
| Quality | Cost versus detail | Auto/Eco/Balanced/High; actual resolution displayed as diagnostics |

Use seconds, degrees, ratios, and calibrated labels where appropriate. A 0–1 slider is acceptable if its endpoints have observable examples and its mapping is documented. Distinguish live preview, commit, undo, reset, and new seed. Add a “new seed” value rather than treating replay of a deterministic initialization as randomized reseeding.

For mobile, prefer a collapsible bottom sheet with one inspector and large touch controls. Keep the ink visible during editing. The full desktop dashboard can remain the advanced studio. Automated values need a visible indicator and a simple way to disable the automation; otherwise moving a base slider while a driver overrides it will continue to feel arbitrary.

## Mobile performance plan

### Measure first, then establish budgets

Record device/browser, viewport, DPR, selected formats/filtering, recipe/seed, dashboard visibility, grids, passes, first-frame/ready time, CPU submission duration, RAF interval distribution, and GPU time when available. Separate cold startup, normal running, editing, resize, scrolling, and sustained warm-device use. Test at least a midrange Android browser and iOS Safari on named real devices before claiming mobile support.

Use asynchronous disjoint timer queries when supported; discard invalid samples and never block on results. Frame pacing is still needed because GPU duration alone omits browser/UI cost. Smaller backbuffers and a memory budget are established WebGL practices. [MDN WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices).

Candidate experiments, **not accepted quality presets**:

| Profile | Simulation short side | Dye short side | Pressure iterations | Display pixel ratio cap | Simulation target |
| --- | ---: | ---: | ---: | ---: | ---: |
| Eco | 128 | 384 | 12–16 | 1 | 30 Hz |
| Balanced | 192 | 512 | 16–24 | 1–1.5 | 30–60 Hz |
| High | 256 | 768 | 24–32 | 1.5–2 | 60 Hz |

Every profile also needs a total-pixel/maximum-dimension cap so a long portrait or banner cannot grow unchecked. Candidate portable target: roughly 16 MiB of simulation-field storage for Eco; verify actual allocations and adjust from evidence. For the same aspect ratio, replacing 512/40 with 128/16 reduces pressure fragment invocations by about 40 times; 1024→384 reduces dye pixel area about 7.1 times. These are work ratios, not FPS promises.

### Optimize in an order that protects ink identity

1. Correct half-float filtering, timestep/injection semantics, and projection order. Otherwise lowering quality changes the recipe unpredictably.
2. Remove synchronous warmup from the critical path; stop offscreen/hidden rendering and honor reduced motion. Permit a static poster when suspended or unsupported.
3. Cap display pixel count independently from dye and velocity grids. Compare the simpler ink shader to current surface shading.
4. Rate-limit editor telemetry, batch edits and storage, and cache hot-path allocations.
5. Skip inactive work: no-source injection, zero-force composer, zero-vorticity passes. Avoid calculating field noise for point-only injection. Evaluate cheaper noise or lower-frequency force updates only through visual comparison.
6. Experiment with RG16F velocity and R16F pressure/divergence/curl, keeping RGBA16F pigment and runtime format checks. This reduces unused channels; do not assume every format path is supported without probes.
7. Adapt display scale and optional effects first when display-bound; adjust force/detail and solver budgets when simulation-bound. Set a pressure floor from divergence tests. Preserve dye filaments where affordable.

Use hysteresis and slow recovery so quality does not oscillate. Keep effective quality separate from saved scene intent. A downgrade must resample state and preserve material slots; it should not visibly reset the artwork. Never tie ordinary simulation speed to device slowness. Use a bounded fixed-step accumulator, a documented catch-up limit, and an overload policy; avoid a spiral of unlimited substeps.

## Proposed web component contract

Target a native `<fluid-ink>` custom element. React remains an optional adapter; the element/core should not import React, the editor, YouTube, storage, or sensor code. An isolated element is the distributable product; the studio is a consumer of its public API.

Illustrative future usage, **not implemented**:

```html
<script type="module" src="./fluid-ink.define.js"></script>
<fluid-ink preset="two-ink-study" quality="auto"
           interaction="none" aria-hidden="true"
           style="display:block;width:100%;height:320px">
  <img slot="fallback" src="./ink-poster.webp" alt="">
</fluid-ink>
```

| Surface | Proposed contract |
| --- | --- |
| Attributes | Small scalar choices: preset, quality, interaction, paused. Boolean `paused` follows presence semantics. |
| Properties | Versioned structured `config`; stable materials/sources; optional diagnostic settings. No large JSON attributes. |
| Methods | `play()`, `pause()`, `reset({seed})`, `inject({inkId,position,amount,radius})`, `setConfig(patch)`, `getConfig()`. |
| Events | `ready`, `configchange`, `qualitychange`, `error`; typed details and explicit bubbling/composed behavior. No mandatory per-frame events. |
| Styling | Shadow DOM canvas/fallback, host dimensions, documented CSS properties and parts. Editor is separately mounted. |
| Persistence | Off by default for every feature; application-provided persistence adapter or explicit namespace when enabled. |
| Failure | Stable error codes, visible fallback, recoverable context loss, no required console inspection. |

Lifecycle requirements: initialize after connection and valid dimensions; release observers, animation loops, pointer capture, and GPU resources on teardown; reconnect cleanly; coalesce initial attribute/property changes; preserve pre-upgrade properties; handle duplicate registration predictably. Pause intent must remain distinct from visibility suspension so scrolling back onscreen cannot override an explicit pause. Custom elements have dedicated connection/disconnection and attribute callbacks. [MDN custom element lifecycle](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements).

Offer a side-effect-free runtime entry and an explicit registration entry. SSR imports must not evaluate `HTMLElement`, `window`, or WebGL initialization unguarded. Define stable patch validation and change categories: uniforms, source data, resource resize, identity migration. The runtime, not the dashboard, must apply those correctly.

Support at least two independent small instances as a release fixture, with scoped inputs and no shared settings. A page-level budget may limit active instances; do not promise unlimited WebGL contexts. Default ambient interaction should preserve page scrolling; opt-in brush mode can own touch gestures. Interactive embedding requires accessible labeling and keyboard alternatives; decorative rendering can be hidden from assistive technology.

### Build and release

Keep the current Pages build with `base: './'`. Add a distinct library build/output so demo cleanup cannot erase package artifacts. Publish compiled ESM, inlined shader strings, declarations, source maps as chosen, a module registration entry, README, LICENSE, and required notices. Plain browser consumers should need neither Vite `?raw` support nor React. Vite provides library mode and package export patterns; implementation should use the repository's installed version and verify the produced artifacts. [Vite library build documentation](https://vite.dev/guide/build.html#library-mode).

Keep Yarn-only contributor tooling. Do not force an end-user package installation to execute repository-specific package-manager enforcement or refer to omitted scripts. Place React/editor exports in separate optional packages or subpaths with optional/external React peers. Decide the package name, registry, compatibility promises, and version policy before publication; no publication is performed by this review.

Gate releases on an actual `yarn pack` artifact installed in fresh fixtures: plain HTML/module, a typed bundler consumer, React, and SSR import. Inspect every export, shader, declaration, stylesheet, and license in that tarball. A demo build passing does not establish that consumers can install the library. Keep dependency/technique provenance, especially shader/noise and future pigment data, documented; visual resemblance alone does not establish source provenance.

## An ideal repository

Use a small workspace only when the release boundaries justify it:

```text
packages/
  core/             # lifecycle, config, units, solver, GPU resources, render, quality
  element/          # custom element, shadow styles, registration, fallback
  react/            # optional thin wrapper
  studio/           # editor, presets UI, automation UI
examples/
  vanilla/ react/ ssr/ scrolling-page/ multiple-instances/
apps/
  showcase/         # Pages landing and studio demonstration
research/
  ink-optics/ transport/ mobile-budgets/  # original experiments and results
tests/
  cpu/              # schema, migrations, units, source math, quality decisions
  browser/          # proposed future lifecycle, GPU invariants, visual scenarios
docs/
  decisions/ api/ materials/ performance/ releases/
```

Inside core preserve separate simulation, rendering, input-command, lifecycle, and quality modules. Do not split each tiny shader into a package. Start by extracting an explicit public runtime interface within the existing tree; move folders after consumers prove those boundaries.

Three distinct data objects prevent today's coupling:

- **Scene recipe:** seed, medium version, ink identities, sources, motion intent, optional automation.
- **Runtime policy:** resource limits, effective quality, update/render cadence, visibility, capability and reduced-motion policy.
- **Editor state:** selection, panels, undo history, graph layout, optional storage adapter.

The perfect repository makes a promise traceable: a control has units and a demonstration; a preset has a model version and reference frames; a performance claim has a named device and trace; a release has an installable artifact and consumer test. Retain the existing original-pass policy, optional-input independence, WebGL2 scope, and separation of transport from appearance.

## Delivery sequence and acceptance gates

| Stage | Deliverable | Acceptance evidence |
| --- | --- | --- |
| 1. Correctness baseline | Fix filtering, source timing, stable slots, radius mapping, final projection; separate clocks and make default motion independent of drivers | Equal-time injection checks; slot removal/reuse scenario; footprint agreement; measured divergence; meaningful GPU checks proposed alongside the current CPU suite |
| 2. Ink vertical slice | One excellent two-ink scene, absorption renderer, stable palette, source dose, sparse stirring | Six visual scenes above reviewed against licensed/project-owned references; dilution and overlap work with glow/metallic/color cycling disabled |
| 3. Portable runtime | Async startup, resize preservation, adaptive quality, pause/offscreen/reduced-motion, resource recovery | Named Android/iOS traces; proposed Eco gate: p95 frame interval at or below about 35 ms for a 30 Hz target over ten minutes, including thermal behavior; smooth page interaction and no reset during downgrade |
| 4. Useful studio | Intent controls, direct source manipulation, mixture previews, undo, mobile sheet | Users can create a two-ink composition without touching Jacobi/noise implementation controls; base/live distinction is obvious; keyboard and touch workflows work |
| 5. Component release | Native element, optional adapters, compiled library, consumer examples, versioned docs | Tarball fixtures pass; two instances independent; reconnect/context-loss/failure cases clean up; unsupported GPU displays fallback; release instructions reproducible |

The numerical targets in Stage 3 are proposed acceptance criteria, not achieved measurements. Select named supported devices and revise the targets using evidence. Proposed browser/GPU tests require a follow-up testing decision because current repository rules intentionally constrain tests to CPU utilities. Do not add unrelated tests or a new framework merely to accompany this review.

The first implementation should combine **correctness fixes and one ink scene**, followed by mobile/runtime work before a public release. Packaging the current tuner unchanged would export its arbitrary semantics and lifecycle limitations as public API obligations.
