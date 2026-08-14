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
- **Review trigger:** The Phase 0 research issues establish enough evidence to select an initial stack.

### DEC-002 — Separate simulation from appearance

- **Status:** Accepted
- **Date:** 2026-08-14
- **Context:** One evolving field should support multiple material identities.
- **Decision:** Keep simulation state and transport separate from material rendering.
- **Alternatives:** Encode each material directly in the simulation.
- **Consequences:** Materials can evolve independently, while interfaces between the layers must remain clear.
- **Evidence:** `docs/ARCHITECTURE.md`.
- **Review trigger:** A validated technique requires tighter coupling and documents why it is worth the tradeoff.
