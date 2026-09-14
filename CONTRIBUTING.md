# Contributing

## Before starting

- Begin with a GitHub issue or a clearly written task.
- Confirm the outcome, non-goals, acceptance criteria, and validation approach.
- Check the roadmap, open questions, and decision log.
- Read [root instructions](AGENTS.md), applicable scoped guides, and folder READMEs using [the context map](docs/CONTEXT_MAP.md). Preserve unrelated working-tree changes.

## Change discipline

- Keep each change focused.
- Prefer reversible choices while the project is in discovery.
- Separate factual findings from proposals.
- Link research to primary sources when possible.
- Do not introduce implementation or tooling through a documentation task.

## Capturing knowledge

- Product direction belongs in [PROJECT.md](docs/PROJECT.md); accepted rationale/history belongs in [DECISIONS.md](docs/DECISIONS.md).
- Keep unresolved choices in [OPEN_QUESTIONS.md](docs/OPEN_QUESTIONS.md), current mechanics and change recipes in [ENGINEERING_GUIDE.md](docs/ENGINEERING_GUIDE.md), and folder interfaces in local READMEs.
- When changing a public behavior, config unit, storage format, lifecycle, or resource budget, update its docs and compatibility notes in the same change.
- New maintained folders need local agent context and a README, linked from the context map. Do not document generated/dependency internals as project-owned folders.

## Validation

Use the existing README scripts, `yarn test` and `yarn build`, for implementation. Documentation-only work needs link/fragment, heading, terminology, and consistency checks. Follow the root agent install restriction; missing tools are a reported limitation, not permission to add dependencies.

Distinguish CPU/build evidence from browser appearance, GPU numerics, device performance, and packed-package installation. See the engineering guide for evidence expectations. Do not add test tooling to validate prose changes.

## Pull requests

A pull request should explain:

- what changed and why;
- what is intentionally out of scope;
- how the change was validated;
- which decisions, risks, or follow-up tasks remain.

Use the pull request template and keep documentation aligned with the change.
