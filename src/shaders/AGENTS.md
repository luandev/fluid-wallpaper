# GPU passes: agent context

Scope: `src/shaders/` and descendants. Read [root guidance](../../AGENTS.md), ancestor instructions, and [this folder's contract](README.md).

Coordinate shader interfaces with sources.ts, sim/programs.ts, solver uniforms, and render/display.ts. Use existing include markers and GLSL ES 3.00. Record field units, sampling, boundary treatment, and pass order when changing transport. Preserve original-source/provenance policy; CPU/build checks do not execute GPU rendering.

For change recipes and known limitations, see [the engineering guide](../../docs/ENGINEERING_GUIDE.md). Follow root validation rules and update local context when a contract changes.

