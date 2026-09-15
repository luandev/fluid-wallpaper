# Shaders and fluid technique

This page owns the public explanation of the **Navier–Stokes problem**, the **stable-fluids / GPU Gems ch. 38** method family used here, and how **WebGL2 shaders** carry that work. Implementation details live under `src/sim` and `src/shaders`. Experimental two-liquid numerics remain in [TWO_LIQUID.md](TWO_LIQUID.md).

## The Navier–Stokes problem (in plain terms)

Real fluids are governed by the **Navier–Stokes equations**: how velocity and pressure evolve under inertia, viscosity, and forces, while mass is conserved.

For wallpaper art we care about a simplified **2D incompressible** story:

1. **Momentum** — velocity changes because of advection (the fluid carries itself), viscosity (smoothing), and authored forces (stir, wind, curl noise).
2. **Incompressibility** — the velocity field should stay roughly divergence-free (no unexplained sources or sinks of volume). A **pressure** field is solved so the projected velocity obeys that constraint.
3. **Transport** — pigment (and other scalars) ride along that velocity.

Exact continuum Navier–Stokes on a fine grid is expensive and stiff. Interactive demos therefore use a **stable, approximate** discrete scheme that looks fluid under artistic budgets rather than matching laboratory CFD.

## Technique family: Stam stable fluids on the GPU

This project studies Jos Stam’s **stable fluids** approach and the GPU presentation in [GPU Gems chapter 38](https://developer.nvidia.com/gpugems/gpugems/part-vi-beyond-triangles/chapter-38-fast-fluid-dynamics-simulation-gpu) (*Fast Fluid Dynamics Simulation on the GPU*). We implement **original** WebGL2 / GLSL ES 3.00 passes in that method family. Third-party fluid-simulation source is not copied ([repository policy](../AGENTS.md)).

Typical loop (conceptual):

```text
apply forces / inject / vorticity aids
project velocity (pressure / Jacobi-style solve)   ← keep flow incompressible
advect velocity (semi-Lagrangian)
advect dye / scalars with the resulting flow
display: interpret concentrations as look
```

Key ideas:

| Idea | What it means here |
| --- | --- |
| **Semi-Lagrangian advection** | Trace each texel backward along velocity and sample the previous field — stable at larger steps than naive forward schemes. |
| **Pressure projection** | Estimate divergence, iteratively relax a pressure-like field (Jacobi-style), subtract its gradient so velocity stays closer to divergence-free. |
| **Vorticity confinement** | Reintroduce some curl lost to numerical dissipation so motion stays lively. |
| **Packed dye** | Up to four **concentration** channels share one velocity field; display shaders turn weights into color, sheen, glow ([DEC-005](DECISIONS.md#dec-005--packed-material-concentrations-and-25d-look)). |

Simulation moves fields. Rendering decides material look (`display.frag.glsl`). That split is intentional ([ARCHITECTURE.md](ARCHITECTURE.md)).

## How shaders fit

Passes are fullscreen GLSL ES 3.00 fragments writing float / half-float targets (WebGL2, [DEC-003](DECISIONS.md#dec-003--webgl2-first-runtime)):

| Role | Where |
| --- | --- |
| Catalog / includes | [`src/shaders/sources.ts`](../src/shaders/sources.ts) |
| Advection, pressure, curl, inject, wind, composer | fragments under [`src/shaders/`](../src/shaders/) |
| Orchestration | [`src/sim/solver.ts`](../src/sim/solver.ts) |
| Look / alpha / lighting response | [`src/shaders/display.frag.glsl`](../src/shaders/display.frag.glsl) |

Noise helpers (`noise.glsl`, `perlin.glsl`) are included by markers, not a second shading language. The opt-in two-liquid path uses separate original passes documented in [TWO_LIQUID.md](TWO_LIQUID.md).

## What this is not

- Not a claim of physical CFD accuracy, conservation proofs, or mobile thermal certification.
- Not a copy of any third-party demo’s shader tree.
- Not settled optics for Kubelka–Munk paint or full multiphase industrial solvers — those remain research / prototype tracks.

For engineers changing pass order, formats, or residuals, start with [ENGINEERING_GUIDE.md](ENGINEERING_GUIDE.md) and the folder contracts in [`src/sim/README.md`](../src/sim/README.md) / [`src/shaders/README.md`](../src/shaders/README.md).

## Further reading

- Jos Stam, *Stable Fluids* (SIGGRAPH 1999) — method family for interactive stable fluids.
- [GPU Gems ch. 38](https://developer.nvidia.com/gpugems/gpugems/part-vi-beyond-triangles/chapter-38-fast-fluid-dynamics-simulation-gpu) — GPU pass structure commonly used in demos.
- Project maps: [ARCHITECTURE.md](ARCHITECTURE.md) · [REVIEW_INK_COMPONENT.md](REVIEW_INK_COMPONENT.md) (labeled findings, not automatic authority).
