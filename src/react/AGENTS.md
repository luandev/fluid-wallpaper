# React embedding: agent context

Scope: `src/react/` and descendants. Read [root guidance](../../AGENTS.md), ancestor instructions, and [this folder's contract](README.md).

Preserve config as initial-only until an explicit API change; persistence defaults off for base config, with known shared preset/chrome exceptions documented in the engineering guide. Keep Engine lifecycle cleanup and lazy dashboard loading. The release build compiles this React export and declarations; consumers import the exported stylesheet. The native element is a separate entry.

For change recipes and known limitations, see [the engineering guide](../../docs/ENGINEERING_GUIDE.md). Follow root validation rules and update local context when a contract changes.
