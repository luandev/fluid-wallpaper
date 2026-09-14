# Runtime and authored state: agent context

Scope: `src/app/` and descendants. Read [root guidance](../../AGENTS.md), ancestor instructions, and [this folder's contract](README.md).

Read config.ts, engine.ts, and the engineering guide for cross-cutting changes. Keep base config separate from driven live values and chrome state. Update defaults, validation, field help, binding rules, persistence compatibility, and relevant tests together when adding a setting. applyConfig currently does not handle every resource rebuild; do not document it as doing so.

For change recipes and known limitations, see [the engineering guide](../../docs/ENGINEERING_GUIDE.md). Follow root validation rules and update local context when a contract changes.

