# Repository context map

Start at [root AGENTS.md](../AGENTS.md), then [README.md](../README.md), [PROJECT.md](PROJECT.md), and the relevant decisions/open questions. Read ancestor and local agent guides for the paths being changed. Loading this map does not require loading every linked file.

## Sources of truth

| Question | Owner |
| --- | --- |
| How should I work here? | [Root instructions](../AGENTS.md), scoped guides below, [agent workflow](AI_ASSISTED_DEVELOPMENT.md) |
| What are we building and why? | [Product](PROJECT.md), [accepted decisions](DECISIONS.md) |
| What remains undecided? | [Open questions](OPEN_QUESTIONS.md) |
| How does the current implementation connect? | [Architecture](ARCHITECTURE.md), folder contracts, [engineering guide](ENGINEERING_GUIDE.md) |
| How do I run/embed it? | [Usage](USAGE.md), [root README](../README.md) |
| What did the source review find? | [Dated ink/component review](REVIEW_INK_COMPONENT.md); proposals are labeled |
| What is next? | [Roadmap](ROADMAP.md), current task/issue; not an inferred implementation mandate |

## Maintained folders

| Folder | Local context | Responsibility |
| --- | --- | --- |
| Repository root | [AGENTS.md](../AGENTS.md) · [README.md](../README.md) | Shared rules, entry pages, package/build configuration |
| `.github/` | [Agent guidance](../.github/AGENTS.md) · [Folder contract](../.github/README.md) | Repository automation |
| `.github/ISSUE_TEMPLATE/` | [Agent guidance](../.github/ISSUE_TEMPLATE/AGENTS.md) · [Folder contract](../.github/ISSUE_TEMPLATE/README.md) | Issue templates |
| `.github/workflows/` | [Agent guidance](../.github/workflows/AGENTS.md) · [Folder contract](../.github/workflows/README.md) | CI and Pages |
| `assets/` | [Agent guidance](../assets/AGENTS.md) · [Folder contract](../assets/README.md) | Source assets |
| `assets/references/` | [Agent guidance](../assets/references/AGENTS.md) · [Folder contract](../assets/references/README.md) | Visual references |
| `docs/` | [Agent guidance](../docs/AGENTS.md) · [Folder contract](../docs/README.md) | Durable project knowledge |
| `scripts/` | [Agent guidance](../scripts/AGENTS.md) · [Folder contract](../scripts/README.md) | Repository mechanics |
| `src/` | [Agent guidance](../src/AGENTS.md) · [Folder contract](../src/README.md) | Application source |
| `src/app/` | [Agent guidance](../src/app/AGENTS.md) · [Folder contract](../src/app/README.md) | Runtime and authored state |
| `src/inputs/` | [Agent guidance](../src/inputs/AGENTS.md) · [Folder contract](../src/inputs/README.md) | Optional interaction |
| `src/landing/` | [Agent guidance](../src/landing/AGENTS.md) · [Folder contract](../src/landing/README.md) | Public showcase |
| `src/platform/` | [Agent guidance](../src/platform/AGENTS.md) · [Folder contract](../src/platform/README.md) | Browser lifecycle boundary |
| `src/quality/` | [Agent guidance](../src/quality/AGENTS.md) · [Folder contract](../src/quality/README.md) | Quality budgets |
| `src/react/` | [Agent guidance](../src/react/AGENTS.md) · [Folder contract](../src/react/README.md) | React embedding |
| `src/element/` | [Agent guidance](../src/element/AGENTS.md) · [Folder contract](../src/element/README.md) | Native custom-element host |
| `src/render/` | [Agent guidance](../src/render/AGENTS.md) · [Folder contract](../src/render/README.md) | Display interpretation |
| `src/shaders/` | [Agent guidance](../src/shaders/AGENTS.md) · [Folder contract](../src/shaders/README.md) | GPU passes |
| `src/sim/` | [Agent guidance](../src/sim/AGENTS.md) · [Folder contract](../src/sim/README.md) | Transport and GPU resources |
| `src/ui/` | [Agent guidance](../src/ui/AGENTS.md) · [Folder contract](../src/ui/README.md) | Artist editor |
| `src/ui/tabs/` | [Agent guidance](../src/ui/tabs/AGENTS.md) · [Folder contract](../src/ui/tabs/README.md) | Domain inspectors |
| `src/ui/graph/` | [Agent guidance](../src/ui/graph/AGENTS.md) · [Folder contract](../src/ui/graph/README.md) | Automation graph |
| `src/ui/spatial/` | [Agent guidance](../src/ui/spatial/AGENTS.md) · [Folder contract](../src/ui/spatial/README.md) | Spatial editor |
| `tests/` | [Agent guidance](../tests/AGENTS.md) · [Folder contract](../tests/README.md) | CPU validation |

This covers folders containing maintained source, documentation, assets, scripts, and GitHub configuration. Do not add agent guides inside generated `dist/`, dependencies such as `node_modules/`, Git internals, or machine-local tool caches.

## Select context by task

- Simulation or ink: `src/sim`, `src/shaders`, `src/render`, `src/app`; DEC-002/003/005 and the review.
- Artist controls: `src/ui` plus the relevant child inspector/graph/spatial folder; config, help, drivers, and affected CPU tests.
- Lifecycle/mobile: `src/app`, `src/platform`, `src/quality`, relevant shader costs; quality and device questions remain open.
- Embedding/release: `src/react`, package/Vite configuration, `docs/USAGE.md`, workflows; DEC-008 describes today's export, DEC-010 the product direction.
- Optional audio/pointer: `src/inputs`, relevant UI, engine/driver path; DEC-009 and CPU helper tests.
- Documentation: `docs`, the owning module README, root/tool bridges if rules change. Preserve accepted decision history.

## Maintaining context

For a new maintained folder, add a short AGENTS.md linking root/ancestor guidance and a README describing purpose, interfaces, key files, local pitfalls, and validation. Add it here. Keep shared policy at the root and substantive facts in one owner document. Move or remove links when folders change. DEC-011 records this convention.
