# Dashboard inspectors

Read [AGENTS.md](AGENTS.md) and [the UI contract](../README.md). Each tab renders an inspector over the same base/live configuration supplied by Dashboard; it does not own a solver or independent config model.

| File | Responsibility |
| --- | --- |
| [SceneTab.tsx](SceneTab.tsx) | Scalar controlSchema groups, background colors/mode and music setting |
| [MaterialsTab.tsx](MaterialsTab.tsx) | Material cards, look fields, add/remove/duplicate |
| [EmittersTab.tsx](EmittersTab.tsx) | Field/point/pointer sources and selected source |
| [WindTab.tsx](WindTab.tsx) | Procedural stations and selection |
| [DriversTab.tsx](DriversTab.tsx) | Waves/audio controls and graph bindings |
| [PresetsTab.tsx](PresetsTab.tsx) | Preset save/load/import/export |

Use [CommitConfig/PatchFrom](../types.ts) and common rows/cards. Most list edits patch by item ID. The shell supplies spatial placement; tabs do not read GPU pixels. Expensive Scene edits currently request reseed; preset load also reseeds.

Known pitfalls: material deletion shifts GPU channel interpretation; preset storage is shared even with base persistence disabled; live polling does not mean external base patches automatically refresh every editor field. See [the engineering guide](../../../docs/ENGINEERING_GUIDE.md).

Keep help, cap rules, sanitization, and automation registries aligned. Existing CPU tests cover helper rules, not mounted tab rendering. Record keyboard/touch and visual checks separately when changing interaction.
