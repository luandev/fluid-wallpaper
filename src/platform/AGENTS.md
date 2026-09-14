# Browser lifecycle boundary: agent context

Scope: `src/platform/` and descendants. Read [root guidance](../../AGENTS.md), ancestor instructions, and [this folder's contract](README.md).

Keep ResizeObserver, DPR, and document visibility coordination out of FluidSolver. Current visibility is document-level, not element intersection; aspect changes can reseed. Document actual lifecycle behavior and cleanup. Future adaptive or context-restoration changes must coordinate Engine and quality rather than fork the solver.

For change recipes and known limitations, see [the engineering guide](../../docs/ENGINEERING_GUIDE.md). Follow root validation rules and update local context when a contract changes.
