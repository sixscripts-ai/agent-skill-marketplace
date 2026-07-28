# Conversion Rules

## Always copy

- `SKILL.md` (rewritten for Cursor frontmatter)
- `references/**`
- `scripts/**`
- `assets/**`
- `examples/**`
- Other non-secret files in the skill tree

## Rewrite

- Frontmatter `name` → destination slug
- Keep `description` when present; synthesize a minimal one only if missing
- Preserve optional Cursor-compatible keys when present

## Skip by default

- `.DS_Store`, `Thumbs.db`
- `.env*` and obvious credential filenames (override with `--keep-secrets`)
- `overlay.yaml` (Claude plugin metadata)
- Anything under a nested `upstream/` path after merge (content is flattened)

## Refuse

- Writing into `~/.cursor/skills-cursor/`
- Path traversal outside destination root
- Overwriting an existing destination without `--force`
