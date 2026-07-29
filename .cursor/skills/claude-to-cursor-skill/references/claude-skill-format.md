# Claude Skill Format

## Common layouts

### Project / personal Claude skills

```text
.claude/skills/<slug>/
  SKILL.md
  references/
  scripts/
  assets/
```

### Claude plugin skill cache

```text
.../skills/<slug>/
  SKILL.md                 # optional overlay
  overlay.yaml             # optional
  upstream/
    SKILL.md
    references/
    scripts/
```

When both overlay and `upstream/` exist:

1. Start from `upstream/` files.
2. Overlay root-level files win on path conflicts.
3. Do not copy `overlay.yaml` into Cursor output unless the user asks.

## Frontmatter notes

Claude skills typically include:

- `name`
- `description`
- optional nested `metadata` (priority, docs, pathPatterns, bashPatterns, promptSignals)

Cursor does not require Claude-only discovery metadata. Keep `name` + `description`; optionally preserve `metadata` for continuity.
