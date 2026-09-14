# Two-liquid implementation and evidence

Status: **experimental implementation; the full adaptive two-liquid plan is not complete**. The legacy path and its uncommitted changes are preserved. Architecture authorization comes from the owner's implementation plan, recorded in [DEC-013](DECISIONS.md#dec-013--opt-in-two-liquid-scene-and-numerical-prototype).

## Try it

Use `yarn dev`, then open `/liquid.html` for the studio or `/diagnostics.html` for GPU probes. Production builds include both pages with relative URLs. The existing tuner, landing and React embed retain legacy scenes.

```ts
import {
  defineFluidInk,
  defaultLiquidScene,
  type FluidInkElement,
} from "fluid-wallpaper/element";
defineFluidInk();
const element = document.createElement("fluid-ink") as FluidInkElement;
element.scene = defaultLiquidScene(); // Set before connecting to avoid legacy initialization.
document.body.append(element);
const next = element.scene;
if (next) {
  next.absorption = 1.4;
  element.updateScene(next); // Keeps field state and identities.
}
element.inject({
  position: { x: 0.5, y: 0.5 },
  pigmentSlot: 0,
  fraction: 0.2,
  radius: 0.04,
});
```

Assigning `scene` creates a new composition. `updateScene` preserves state and rejects slot ID/carrier changes. Assign `null` to return to legacy configuration. Legacy damping, contrast and dose have no automatic physical migration. `setConfig` rejects liquid-scene edits. `play`, `pause`, `reset` and `inject` remain available. `qualityStatus` and `qualitychange` expose requested/effective FPS, dimensions, effects, discarded simulation time, reason, allocations and timing. Reduced motion starts with a static composition until explicitly played. The root package remains private; compiled preview distribution is owned by [RELEASE.md](RELEASE.md).

## Numerical contract

Original passes: [liquid.frag.glsl](../src/shaders/liquid.frag.glsl). Resource ownership: [liquidSolver.ts](../src/sim/liquidSolver.ts). No third-party simulation source was copied.

- Equal density is one in nondimensional units. Domain short side is one; `h=1/min(width,height)`. Integer grid dimensions approximate aspect, limited to 1:16–16:1.
- Phase fraction and four pigment masses per mixture volume are cell centered. RG stores right/top MAC face velocities; left/bottom external velocities are zero. Pressure is a cell-centered projection impulse; reported pressure divides by timestep. Walls impose zero normal velocity, free-slip tangential stress, and zero phase/pigment flux.
- Momentum order: semi-Lagrangian face-velocity advection, bounded artistic forcing/drag and continuum surface force, implicit variable-viscosity stress, pressure projection. Surface force and pressure gradient share face locations. Curvature uses centered divergence of normalized phase gradients. Interface normals are not used as lighting normals.
- Viscous stress includes normal and cross-component shear terms of `div[mu(grad(u)+grad(u)^T)]`, using cell viscosity and corner averages. Relaxed Jacobi solves backward Euler. Pressure uses matching MAC divergence/gradient and weighted Jacobi with Neumann walls. Residual targets are `1e-5`; caps are 512 viscosity and 2,560 pressure iterations. Residuals are reported even if a cap is exhausted; sufficiency across the authored range is unverified.
- Phase transport uses centered conservative advection/diffusion/compression face fluxes following Mirjalili, Ivey and Mani. Here `epsilon=h`, `gamma=max(0.001,max(abs(face component)))`, and `dt<=h/(8 gamma)`, half the 2D diffusion limit. An explicit capillary guard uses `dt<=0.25 sqrt(h^3/(pi sigma))`. Post-projection speed is checked. A violated transport limit stops the runtime; retry/rollback remains unfinished.
- The flux is expressed as two nonnegative directional donor rates. Pigments use their carrier's rates with pigment mass replacing phase fraction. GPU values are not clipped/renormalized to hide drift. Finite projection residual, boundaries and floating point mean the paper's exact boundedness theorem is **not claimed** for the complete solver. Within-phase pigment numerical diffusion needs visual review.
- Injection replaces a Gaussian fraction of filled mixture: displaced phase/pigment exits proportionally, incoming carrier fills the volume, and the selected pigment receives `fraction*dose`. Fraction is a peak in `[0,1]`; radius uses short-side units. A continuous normalized source-rate API is unfinished.
- Pigment and phase grids currently coincide for identical transfer coefficients. A separate higher-resolution pigment grid is **not implemented**.

## Optical and artistic contract

[liquidDisplay.frag.glsl](../src/shaders/liquidDisplay.frag.glsl) evaluates `tau=path*absorption*(phi*aA+(1-phi)*aB+sum(c_i*a_i))` and transmission `exp(-tau)`. Concentrations are not normalized. Coefficients are nonnegative linear RGB artistic values, and path is a constant effective length in corresponding arbitrary units. Substrate is authored sRGB, decoded before multiplication, with output encoded once. The canvas composite is opaque and cannot transmit arbitrary DOM content with RGB-dependent attenuation.

Relief is a bounded interface-band signal used only for lighting. Gloss adds restrained dielectric reflection and roughness. Optional detail advects two UV banks packed into one texture, resets the zero-weight bank every four simulated seconds, and crossfades sinusoidal detail. Resolved strain modulates amplitude; screen derivatives suppress undersampled detail. This is an original artistic approximation, not Wavelet Turbulence, physical droplets or film thickness. Substrate textures/offset refraction and dilution-swatch calibration remain unfinished. Thin-film interference is deferred by the plan.

## Runtime and costs

[LiquidEngine](../src/app/liquidEngine.ts) owns the opt-in frame loop. React only edits authored scene state. Physics targets 30 Hz with stability subdivision and at most four substeps per presented frame. Excess lag is reported as slowdown. Presentation targets 30 FPS and a two-second 60 FPS gesture boost; minimum quality may use 24 FPS. Hidden/offscreen/paused time is discarded.

Quality evaluates once per second, requires two overloaded or ten comfortable windows, and enforces a five-second cooldown. Each window uses the 90th percentile of submitted work samples and flags pacing overload when more than 20% miss the target by 20%. Async GPU queries reject disjoint batches. CPU submission duration is labeled as a proxy; synchronous prototype readbacks can include GPU waiting.

Current tiers remove optional detail, reduce display pixels, then reduce the shared pigment/simulation grid. Initial caps: 65,536 cells and 524,288 display pixels. The higher ceilings in the plan are unfinished. Eight RGBA32F fields cost `128*cells` bytes (8 MiB at 65,536 cells). Transitions check old plus new field allocations against 32 MiB. Canvas backing pixels, driver allocations and CPU arrays are separate; this does not measure GPU memory capacity.

Resize uses CPU overlap integration of normalized-domain cell averages, then velocity reprojection. It preserves mean composition across aspect changes, not physical mass in a changing metric-domain area. Packed velocity currently uses cell-average resampling; proper face-flux prolongation remains needed. Detail fades toward its target over 250 ms; other effects fade in after resize.

The visible-instance registry divides display area and favors an active instance. It is **not yet a coordinated solver-time budget**. Context loss suspends work; restoration creates a new scene and reports the loss. State-preserving recovery, incremental shader initialization and efficient GPU reductions remain unfinished. These limitations preclude mobile performance claims.

## Validation and remaining acceptance

Use `yarn test` and `yarn build`. The browser fixture needs no new test dependency. It reports field extrema/means, velocity/divergence maxima, residuals, pass counts, allocations and environment. CPU coverage includes scene validation/carriers, dilution/equal optical depth, conservative noninteger resize, nonnegative donor coefficients, area caps, equal-time 30/60/120 Hz scheduling/dose, catchup limits and hysteresis. These do not prove GPU behavior.

The fixture provides a closed-domain 60-second reversing cellular flow, a one-second static circle and a portrait resize. Cellular reversal is not the plan's independent translation test. Static refinement must compare pressure jump with the **2D** target `sigma/0.22` and decreasing spurious velocity at 32/64/128 grids; one probe does not establish convergence.

Still required: translation, long static-drop/grid studies, viscous shear and timestep/grid convergence, GPU equal-time source dose, palette/carrier invariants in evolving GPU fields, optical GPU swatches, repeated quality transitions, two-embed scheduling, scrolling/pause/reconnect/context-loss/portrait/reduced-motion tests, and 20-minute named iPhone/Safari, midrange Android/Chrome and integrated-GPU desktop runs. No hardware support is certified by this change.

### Session evidence (2026-09-13)

- Final `yarn test`: 103 tests passed. Final `yarn build`: TypeScript and all five Vite pages passed. Existing dependencies were present but three Windows launchers were absent; temporary launchers outside the repository ran the existing scripts. No packages were installed or dependency files changed.
- Browser: HeadlessChrome 143, Linux x86_64, WebGL2 through ANGLE/Vulkan SwiftShader software rendering. This is shader execution evidence, not mobile performance evidence.
- Initial resize probe before the added detail/residual passes: 64×64 to 48×128, relative phase-mean drift `1.0042e-9`, bounded within `1e-5`, pigments nonnegative. Synchronous-readback wall time was about 2.09 seconds on software rendering. Updated probes are recorded below when completed.
- Updated production-build 64×64 reversing cellular flow: 60 simulated seconds, 214.410 seconds wall time, 7,205 GPU passes, 524,288 field bytes. Relative phase-mean drift `1.80798545e-6` (0.000180799%), phase range `[2.71535e-13, 0.99999845]`, minimum pigment `4.25628e-14`, maximum divergence `5.96046e-8`. These pass the fixture's boundedness/mass/nonnegativity thresholds for this prescribed-flow test; momentum was bypassed.
- Updated 32×32 static drop at one simulated second: maximum velocity `1.29232e-5`, pressure jump `4.45942e-4` (2D target `4.54545e-4`), divergence/pressure residual `8.96398e-9`, viscosity residual bound `4.59283e-6`. Relative phase-mean drift `3.43685e-8`, nonnegative pigments. Wall time 13.684 seconds and 3,029 passes. This is one refinement sample, not convergence acceptance.
- Updated 64×64 static drop at one simulated second: maximum velocity `1.05185e-5`, pressure jump `4.66860e-4`, divergence/pressure residual `9.70461e-6`, viscosity residual bound `5.54857e-6`. Relative phase-mean drift `3.33953e-8`; maximum phase `1.00000429` (a real `4.3e-6` overshoot, though within the fixture tolerance). Wall time 242.295 seconds, 30,629 passes. Pressure-jump error increased relative to the 32-grid sample: **static-drop convergence acceptance is not met**. Fix/review pressure tolerance, curvature/interface discretization and refinement evidence before enabling autonomous stirring by default. The studio starts paused so this costly prototype runs only after Play.
- GPU optical center-pixel spot check in the studio: absorption 0.2 gave `[242,215,191,255]`; absorption 2 gave `[221,75,39,255]`; absorption 1 with optical path 2 gave exactly `[221,75,39,255]`. `gl.getError()` returned zero. This confirms this dilution/equal-depth sample, not palette calibration or a complete visual suite.
- Two scene elements initialized independently with auto/eco policies. With reduced-motion emulation, the second remained static. Offscreen Play performed no solver submissions; scrolling it into view and playing then pausing exercised the loop without a fallback error (zero surface tension/viscosity for this lifecycle smoke probe). This does not establish two-active-instance performance.
- Forced `WEBGL_lose_context` revealed invalid old-handle cleanup on restoration; fixed by discarding invalidated ownership. Retested the final production build: restored a fresh scene, reported the reset reason, remained paused, and returned GL error zero with no fallback error. Field preservation across context loss is not implemented.

## Reference provenance

- [Mirjalili, Ivey and Mani](https://arxiv.org/pdf/1803.01262): equations 11–17 and multidimensional diffusion limit. Mathematical method studied, original implementation, no source imported. Its incompressibility/discretization assumptions prevent a blanket theorem claim here.
- [PBRT, Transmittance](https://pbr-book.org/4ed/Volume_Scattering/Transmittance): exponential optical depth. RGB coefficients here are not spectral pigment chemistry.
- [Kim et al., Wavelet Turbulence](https://www.tkim.graphics/WTURB/): conceptual coarse/fine separation only; no wavelet decomposition or source reuse.
- [Zsolnai and Szirmay-Kalos](https://users.cg.tuwien.ac.at/zsolnai/wp/wp-content/uploads/2014/01/fluid_control_poster_2page.pdf): distinction between controlling forces and physical parameters. The stir field is not their shape-control algorithm.
- [Khronos timer-query extension](https://registry.khronos.org/webgl/extensions/EXT_disjoint_timer_query_webgl2/): asynchronous availability and disjoint rejection.

The plan's OpenAI 3D theorem discussion supplies no numerical pass or mobile optimization here. Its proof and timing claims were not independently verified in this implementation session and are not implementation evidence.

### Adaptive ECO update

DEC-016 adds an independent ECO ceiling with shared overload/recovery windows, progressively smaller grids and slowed simulation time. ECO no longer stays fixed and pointer gestures do not boost its frame rate. Existing Auto adaptation is retained. [ECO.md](ECO.md) owns the updated runtime contract; physical convergence and mobile acceptance remain incomplete.
