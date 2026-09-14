# Transport and GPU resources: agent context

Scope: `src/sim/` and descendants. Read [root guidance](../../AGENTS.md), ancestor instructions, and [this folder's contract](README.md).

Read solver.ts, gpu.ts, capabilities.ts, and matching shaders together. Keep concentration channels distinct from RGB, float resource probing explicit, and ownership/cleanup reviewable. Known injection timing, projection order, filtering, and slot issues are in the engineering guide; do not turn current defects into desired invariants. New transport methods need numerical and visual evidence.

For change recipes and known limitations, see [the engineering guide](../../docs/ENGINEERING_GUIDE.md). Follow root validation rules and update local context when a contract changes.

