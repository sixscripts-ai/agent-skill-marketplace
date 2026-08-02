# Cursor Skill Format

## Install locations

| Type | Path | Notes |
|------|------|-------|
| Project | `.cursor/skills/<slug>/` | Shared with the repo |
| Personal | `~/.cursor/skills/<slug>/` | Available across projects |
| Built-in | `~/.cursor/skills-cursor/` | Cursor-managed — never write here |

## Directory layout

```text
<slug>/
  SKILL.md              # required
  references/           # optional docs
  scripts/              # optional helpers
  assets/               # optional binaries/templates
  examples/             # optional fixtures
```

## Required frontmatter

```yaml
---
name: my-skill
description: Third-person description with trigger terms. Use when...
---
```

Optional:

- `disable-model-invocation: true` — only load when explicitly named
- `license`, `compatibility`, `metadata`

## Description guidance

- Third person
- Include WHAT and WHEN / trigger phrases
- Max 1024 characters
