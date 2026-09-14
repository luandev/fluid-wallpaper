# Automation graph: agent context

Scope: `src/ui/graph/` and descendants. Read [root guidance](../../../AGENTS.md), ancestor instructions, and [this folder's contract](README.md).

Keep connect.ts/layout.ts pure and testable without DOM. Paths come from config's bindable registry; last binding wins per target. Rebinding replaces the target binding rather than bypassing caps. The SVG graph edits the same driver data as forms; it must not become a second evaluator or require GPU state.

For change recipes and known limitations, see [the engineering guide](../../../docs/ENGINEERING_GUIDE.md). Follow root validation rules and update local context when a contract changes.

