# Issue templates

Read [local agent guidance](AGENTS.md). These Markdown templates collect enough context for a person or agent to complete one bounded task.

| Template                   | Purpose                                 | Required reasoning                                       |
| -------------------------- | --------------------------------------- | -------------------------------------------------------- |
| [task.md](task.md)         | Implement or document a focused outcome | Context, scope, acceptance, validation, risks            |
| [research.md](research.md) | Resolve one uncertainty                 | Primary evidence, alternatives, criteria, recommendation |
| [bug.md](bug.md)           | Reproduce and fix a defect              | Observed/expected behavior, steps, environment, evidence |

Preserve YAML front matter for GitHub template discovery. Do not place durable architectural choices only in an issue: link the resulting decision and related docs. Validate headings and YAML structure when editing; no runtime behavior lives here.
