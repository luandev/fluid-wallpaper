# Repository instructions

## Purpose

Help develop a living generative fluid wallpaper while keeping the repository understandable, portable, and evidence-driven.

## Current phase

Phase 0–1: a browser-runnable WebGL2 fluid baseline. Implementation is authorized for this stack only (see `docs/DECISIONS.md`, DEC-003).

- Do not add Wallpaper Engine `project.json` properties, Workshop packaging, materials/PBR, audio, or WebGPU unless a task explicitly asks.
- Do not copy third-party fluid-simulation source. Study the Stam / GPU Gems ch. 38 method family and implement original passes.
- Treat further platform and quality questions in `docs/OPEN_QUESTIONS.md` as unresolved until a decision is recorded.

## Before changing anything

1. Read `README.md`, `docs/PROJECT.md`, and the relevant document for the task.
2. Identify the requested outcome, boundaries, and acceptance criteria.
3. Check `docs/DECISIONS.md` and `docs/OPEN_QUESTIONS.md`; do not silently settle an open question.

## Working rules

- Prefer small, reviewable changes tied to one issue or task.
- Preserve the boundary between simulation, rendering, inputs, platform integration, and quality management.
- Keep core behavior independent of optional inputs and platform-specific APIs.
- Reference third-party techniques; do not copy third-party source without an explicit license review.
- Never commit secrets, credentials, private data, generated binaries, or machine-specific settings.
- Record durable architectural choices and their tradeoffs in `docs/DECISIONS.md`.
- Update related documentation when scope, behavior, interfaces, or assumptions change.
- Keep Vite `base` as `'./'` so `dist/` can load from a local folder or Wallpaper Engine later.
- Use Yarn only (`yarn`, `yarn test`, `yarn build`). Do not use npm; installs are blocked.

## Validation

- Documentation: verify links, headings, terminology, and consistency.
- Implementation: run the repository scripts in `README.md` (`yarn test`, `yarn build`). Do not invent extra required commands.
- Report what was checked and any remaining uncertainty.

## Completion

A task is complete when its acceptance criteria are met, relevant docs are current, validation is reported, and unresolved risks are explicit.
