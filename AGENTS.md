# Repository instructions

## Purpose

Help develop a living generative fluid wallpaper while keeping the repository understandable, portable, and evidence-driven.

## Current phase

- The repository is documentation-only.
- Do not add source code, dependencies, build tools, generated files, CI, or deployment configuration unless a task explicitly authorizes it.
- Treat proposed technologies as candidates until a decision is recorded in `docs/DECISIONS.md`.

## Before changing anything

1. Read `README.md`, `docs/PROJECT.md`, and the relevant document for the task.
2. Identify the requested outcome, boundaries, and acceptance criteria.
3. Check `docs/DECISIONS.md` and `docs/OPEN_QUESTIONS.md`; do not silently settle an open question.

## Working rules

- Prefer small, reviewable changes tied to one issue or task.
- Preserve the boundary between simulation, rendering, inputs, platform integration, and quality management.
- Keep core behavior independent of optional inputs and platform-specific APIs.
- Avoid premature framework, package, file-format, or deployment commitments.
- Reference third-party techniques; do not copy third-party source without an explicit license review.
- Never commit secrets, credentials, private data, generated binaries, or machine-specific settings.
- Record durable architectural choices and their tradeoffs in `docs/DECISIONS.md`.
- Update related documentation when scope, behavior, interfaces, or assumptions change.

## Validation

- For documentation-only changes, verify links, headings, terminology, and consistency.
- When implementation begins, use only the repository's documented checks; do not invent commands.
- Report what was checked and any remaining uncertainty.

## Completion

A task is complete when its acceptance criteria are met, relevant docs are current, validation is reported, and unresolved risks are explicit.
