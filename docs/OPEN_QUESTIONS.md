# Open questions

Each question should be resolved through a research issue before it becomes an implementation constraint.

## Ink and component release

[DEC-013](DECISIONS.md#dec-013--opt-in-two-liquid-scene-and-numerical-prototype) now selects an opt-in equal-density two-phase scene, four carrier-bound pigment slots, closed free-slip walls, linear RGB absorption against an explicit substrate, and the plan's adaptive runtime direction. [TWO_LIQUID.md](TWO_LIQUID.md) distinguishes implementation from unfinished acceptance. The questions below still apply to release scope, calibration and support; they no longer imply that the scene model and optical direction are wholly undecided.

The product priority is recorded in [DEC-010](DECISIONS.md#dec-010--ink-first-web-component-product-direction). The [review](REVIEW_INK_COMPONENT.md) proposes options and experiments; it does not resolve these questions:

- Which medium is the first release: ink in water, ink on paper, or a deliberately stylized mixture? Which licensed/project-owned references establish the visual bar?
- Does the first component release require the original three-material catalog, or one thoroughly validated ink scene as the review recommends?
- Which optical model and color-space contract are justified by that medium? How are ink coefficients calibrated?
- What units define dose, brush radius, flow, diffusion, and lifetime? How will old presets migrate?
- How should source/sink behavior preserve interest during long ambient runs without hiding resets or losing material identity?
- Which mobile browsers/devices, memory limits, frame-time budgets, and thermal-duration tests define support?
- What custom-element API, registration, CSS/fallback, persistence, multi-instance, and lifecycle guarantees should ship?
- Which package artifacts, exports, registry/name, and consumer fixtures define an installable release?
- What browser/GPU validation should be added beyond current CPU-only tests, and under what tooling decision?

Stable slot allocation, time-independent injection, filtering, projection, and other source findings are recorded in [ENGINEERING_GUIDE.md](ENGINEERING_GUIDE.md) and the review. Proposed remedies have not been implemented by documentation work.

## Platform

- Which Wallpaper Engine APIs should handle properties, visibility, pause state, audio, and performance signals?
- What lifecycle behavior can be relied on across supported environments?

## GPU capabilities

- Which texture formats, filtering modes, and render-target features are consistently available on target hardware?
- What fallback behavior preserves a complete experience on limited devices?

Phase 0–1 detects `EXT_color_buffer_float` / `EXT_color_buffer_half_float` at runtime and prefers `RGBA16F`. Broader hardware evidence is still needed before locking quality presets.

## Quality budgets

- What internal resolution and iteration budgets define the initial quality levels?
- Which settings should reduce first under frame-time pressure?
- How should update rate and display frame rate be separated?

Legacy non-ECO budgets remain fixed; DEC-016 selects opt-in [adaptive ECO](ECO.md) with runtime resolution, pacing and speed reductions. The opt-in path has an experimental controller; complete multi-instance budgets and named-device validation remain open as tracked in [TWO_LIQUID.md](TWO_LIQUID.md).

## Visual state

Resolved by [DEC-005](DECISIONS.md#dec-005--packed-material-concentrations-and-25d-look) for this phase:

- Independent pigment fields: **four concentrations packed in one `RGBA16F` dye texture** (same bandwidth as the previous RGB dye). Eight materials stay out of scope until a second dye target is justified.
- Depth and material response: **height from concentration sum**, fake normals from that gradient, and a 2.5D mix of roughness / metallic / sheen / glow. Thickness in the solver is a **derived viscosity weight** from the same concentrations, not a second velocity field.

Still open: which extra derived fields (curl, foam, depth peel) are worth a later pass.

## Technology choices

Resolved by [DEC-003](DECISIONS.md#dec-003--typescript-vite-webgl2-and-glsl):

- First GPU path: WebGL2 + GLSL ES 3.00
- Language and build: TypeScript + Vite (`base: './'`)
- Package manager: Yarn Classic only ([DEC-004](DECISIONS.md#dec-004--yarn-only))
- Tests: Vitest for CPU utilities
- Experimental WebGPU: deferred to Phase 6

## Distribution

- What reproducible packaging process best maps source releases to Workshop releases?
- Which assets, licenses, and attribution records are required before publishing?

Ambient desktop install uses the minimal HTML pack (`wallpaper.html` via `yarn pack:wallpaper`, [DEC-019](DECISIONS.md#dec-019---multi-host-html-wallpaper-pack)), never the Git working tree. `dist/index.html` is the public landing; `dist/play.html` remains the tuner. Git/Yarn source install of `<FluidField />` is [DEC-008](DECISIONS.md#dec-008--react-fluidfield-embed); npm registry publish is [DEC-014](DECISIONS.md#dec-014--compiled-npm-preview-and-tag-releases). Workshop upload, user properties, and Wallpaper Engine audio listeners stay open. Browser audio uses Web Audio + mic/tab capture ([DEC-009](DECISIONS.md#dec-009--optional-youtube-music-and-web-audio-drivers)).

## Preview distribution decision

DEC-014 selects npm `fluid-wallpaper`, compiled ESM/declarations/CSS, native and React entries, a `next` preview channel, and tag-driven GitHub Actions publication. Artifact/consumer fixtures and setup are specified in [RELEASE.md](RELEASE.md). Package-name ownership is an external prerequisite; physical/mobile release questions above remain open.
