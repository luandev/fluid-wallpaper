# Domain inspectors: agent context

Scope: `src/ui/tabs/` and descendants. Read [root guidance](../../../AGENTS.md), ancestor instructions, and [this folder's contract](README.md).

Use CommitConfig/PatchFrom from ../types.ts rather than a second settings store. Scene derives scalar controls from controlSchema; list tabs use stable IDs and caps. Coordinate additions with config/help/bindable-path definitions and relevant helper tests. Preserve base/live distinction and label preset/storage and reseed side effects accurately.

For change recipes and known limitations, see [the engineering guide](../../../docs/ENGINEERING_GUIDE.md). Follow root validation rules and update local context when a contract changes.
