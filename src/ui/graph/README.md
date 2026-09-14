# Driver graph

Read [AGENTS.md](AGENTS.md). This is an SVG editor for the same value-emitter/binding data used by the forms.

- [DriverGraph.tsx](DriverGraph.tsx) renders ports/wires and handles selection/connection gestures.
- [layout.ts](layout.ts) builds graph nodes/ports from config and excludes reseed targets.
- [connect.ts](connect.ts) validates connections, replaces bindings to existing paths, enforces capacity, and removes bindings.

Evaluation belongs to [app/drivers.ts](../../app/drivers.ts). Last binding per path wins; graph behavior must agree with that evaluator and the config registry. Pure graph helpers stay independent of document/WebGL. Tests live in [ui-graph.test.ts](../../../tests/ui-graph.test.ts).

The graph is an optional view over automation. Preserve equivalent form editing and document keyboard/touch limitations rather than claiming SVG pointer interactions establish accessibility.
