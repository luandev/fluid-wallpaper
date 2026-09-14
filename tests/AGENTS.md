# CPU validation: agent context

Scope: `tests/` and descendants. Read [root guidance](../AGENTS.md), ancestor instructions, and [this folder's contract](README.md).

Keep the current Vitest Node environment and CPU-only scope. react-field.test.ts tests option/config helpers, not mounted React; shader behavior is not proven by CPU shade tests. Add meaningful boundary/migration tests for changed rules. Browser/GPU tooling remains a proposed follow-up, not a requirement to add during docs work.

For change recipes and known limitations, see [the engineering guide](../docs/ENGINEERING_GUIDE.md). Follow root validation rules and update local context when a contract changes.

