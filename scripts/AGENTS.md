# Repository mechanics: agent context

Scope: `scripts/` and descendants. Read [root guidance](../AGENTS.md), ancestor instructions, and [this folder's contract](README.md).

Keep helpers dependency-free and unrelated to rendering. ensure-yarn.js exports testable guard logic and runs the guard when invoked directly. Preserve that distinction and its CPU tests. An install guard's existence does not authorize an agent install.

For change recipes and known limitations, see [the engineering guide](../docs/ENGINEERING_GUIDE.md). Follow root validation rules and update local context when a contract changes.

