# Application source: agent context

Scope: `src/` and descendants. Read [root guidance](../AGENTS.md), ancestor instructions, and [this folder's contract](README.md).

Preserve Engine ownership of the frame loop and the simulation/render/input/platform/quality boundaries. Consult child guidance before editing. Configuration crosses the sanitize boundary; React edits base state and never steps WebGL passes. Entry points and exports are documented in README.md.

For change recipes and known limitations, see [the engineering guide](../docs/ENGINEERING_GUIDE.md). Follow root validation rules and update local context when a contract changes.
