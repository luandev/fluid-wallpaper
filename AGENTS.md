# Repository instructions

## Purpose

Help develop a living generative fluid wallpaper while keeping the repository understandable, portable, and evidence-driven.

## Current state and direction

The current working tree has a browser-runnable WebGL2 solver, four packed material channels, a React tuner/embed, procedural inputs, and optional browser audio (DEC-003 through DEC-009). These features are not evidence of a completed mobile or package release.

The owner's priority is believable ink mixing, useful controls, mobile performance, and distribution as a web component (DEC-010). The native element exists (DEC-012); DEC-013 authorizes an opt-in two-liquid architecture with experimental absorption and adaptive runtime. [Current implementation and remaining gates](docs/TWO_LIQUID.md) distinguish prototype behavior from accepted release evidence. Other recommendations in [the review](docs/REVIEW_INK_COMPONENT.md) remain proposals unless explicitly accepted.

- Keep TypeScript, Vite, WebGL2, GLSL ES 3.00, and Yarn as the current stack.
- Maintain existing materials/audio within task scope. Do not add new PBR pipelines, sensors, Wallpaper Engine `project.json` properties, Workshop packaging, or WebGPU unless a task explicitly asks.
- Do not copy third-party fluid-simulation source. Study the Stam / GPU Gems ch. 38 method family and implement original passes.
- Treat further platform and quality questions in `docs/OPEN_QUESTIONS.md` as unresolved until a decision is recorded.

## Before changing anything

1. Read `README.md`, `docs/PROJECT.md`, and the relevant document for the task.
2. Identify the requested outcome, boundaries, and acceptance criteria.
3. Check `docs/DECISIONS.md` and `docs/OPEN_QUESTIONS.md`; do not silently settle an open question.
4. Read ancestor and local `AGENTS.md` files for the paths you will edit, plus each folder's `README.md`. Use [the context map](docs/CONTEXT_MAP.md) to find them.
5. Inspect the working tree and preserve unrelated user changes. Source and uncommitted work may be newer than documentation; reconcile discrepancies instead of reverting them.

## Working rules

- Prefer small, reviewable changes tied to one issue or task.
- Preserve the boundary between simulation, rendering, inputs, platform integration, and quality management.
- Keep core behavior independent of optional inputs and platform-specific APIs.
- Reference third-party techniques; do not copy third-party source without an explicit license review.
- Never commit secrets, credentials, private data, generated binaries, or machine-specific settings.
- Record durable architectural choices and their tradeoffs in `docs/DECISIONS.md`.
- Update related documentation when scope, behavior, interfaces, or assumptions change.
- Keep Vite `base` as `'./'` so `dist/` can load from a local folder or Wallpaper Engine later.
- Use Yarn for repository development (`yarn`, `yarn test`, `yarn build`). DEC-014 permits npm packing/publishing and isolated CI consumer installs. Local agent dependency installs remain blocked.

## Documentation and knowledge

- This file owns shared working rules; scoped `AGENTS.md` files add local guidance. Folder READMEs explain purpose, interfaces, and key files.
- [PROJECT.md](docs/PROJECT.md) owns product direction; [DECISIONS.md](docs/DECISIONS.md) owns accepted tradeoffs and history; [OPEN_QUESTIONS.md](docs/OPEN_QUESTIONS.md) owns unresolved choices.
- [ENGINEERING_GUIDE.md](docs/ENGINEERING_GUIDE.md) captures change recipes and known pitfalls. [AI_ASSISTED_DEVELOPMENT.md](docs/AI_ASSISTED_DEVELOPMENT.md) describes the task and handoff workflow.
- Label observations, hypotheses, proposals, accepted decisions, and measured results distinctly. A review recommendation is not implementation authority by itself.
- When a task changes a contract, update its owning document and local context in the same change. Avoid copying defaults or policies into multiple files.
- Explicit user instructions take precedence over repository guidance. Scope exceptions already authorized by the task do not require another permission request.

## Validation

- Documentation: verify links, headings, terminology, and consistency.
- Implementation: run the repository scripts in `README.md` (`yarn test`, `yarn build`). Do not invent extra required commands.
- Report what was checked and any remaining uncertainty.
- CPU tests and a build do not prove shader correctness, rendered appearance, mobile performance, or package installability. Record actual evidence and device/environment details for those claims.
- If dependencies are missing, report the blocked commands without installing packages or claiming validation passed. Documentation-only work needs link, heading, and consistency checks; do not add test tooling for it.

## Completion

A task is complete when its acceptance criteria are met, relevant docs are current, validation is reported, and unresolved risks are explicit.
