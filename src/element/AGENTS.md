# Native element: agent context

Scope: `src/element/` and descendants. Read [root guidance](../../AGENTS.md), [source guidance](../AGENTS.md), and [this folder's contract](README.md).

This is the framework-neutral host for the current Engine. Keep React, dashboard, storage, YouTube, and media permissions out of this folder. The public element must own lifecycle cleanup and keep state scoped to its instance.

The element wraps the legacy FluidConfig/Engine path and an opt-in experimental two-liquid scene. DEC-014 authorizes compiled preview distribution; physics and mobile acceptance remain incomplete. Keep unsupported API behavior explicit rather than silently simulating it.

For cross-cutting runtime changes, read [the engineering guide](../../docs/ENGINEERING_GUIDE.md). Update package exports and usage docs with public API changes.
