# AI-assisted development

## Instruction strategy

`AGENTS.md` is the canonical, tool-neutral repository instruction file.

- Codex and ChatGPT coding agents read `AGENTS.md`.
- Cursor supports `AGENTS.md` as the simple Markdown alternative to structured `.cursor/rules/*.mdc` rules.
- `CLAUDE.md` imports `AGENTS.md`, avoiding duplicated guidance.
- `.github/copilot-instructions.md` is a small bridge for GitHub Copilot experiences while Copilot coding agents can also use `AGENTS.md`.

Do not create duplicate copies of the same rules. Add tool-specific instructions only when a real incompatibility appears.

## Prompting a coding agent

Give every task:

1. A concrete outcome
2. Relevant context and links
3. Explicit in-scope and out-of-scope boundaries
4. Verifiable acceptance criteria
5. The expected validation
6. Known risks or unresolved decisions

The issue templates encode this structure.

## Context hygiene

- Keep always-loaded instructions concise and actionable.
- Put product facts in project docs, not in repeated agent rules.
- Record durable decisions in the decision log.
- Use issues for temporary task context.
- Add scoped rules only after repeated mistakes show a clear need.
- Prefer primary documentation and small experiments over remembered assumptions.

## Safety

Agent instructions guide behavior; they are not a security boundary. Use platform permissions, branch protection, reviews, secret scanning, and automated checks when implementation begins.

## Official references

Checked on 2026-08-14:

- [OpenAI: Custom instructions with AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- [Anthropic: How Claude remembers your project](https://code.claude.com/docs/en/memory)
- [Cursor: Rules](https://cursor.com/docs/rules)
- [GitHub: Adding repository custom instructions for Copilot](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions)
