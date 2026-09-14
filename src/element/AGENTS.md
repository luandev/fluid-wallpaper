# Native element: agent context

Scope: `src/element/` and descendants. Read [root guidance](../../AGENTS.md), [source guidance](../AGENTS.md), and [this folder's contract](README.md).

This is the framework-neutral host for the current Engine. Keep React, dashboard, storage, YouTube, and media permissions out of this folder. The public element must own lifecycle cleanup and keep state scoped to its instance.

The current element wraps the legacy FluidConfig/Engine path. It is an incremental runtime foundation; it does not yet implement the planned two-phase immiscible solver or a final published package. Keep unsupported API behavior explicit rather than silently simulating it.

For cross-cutting runtime changes, read [the engineering guide](../../docs/ENGINEERING_GUIDE.md). Update package exports and usage docs with public API changes.
