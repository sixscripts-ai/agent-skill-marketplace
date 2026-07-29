#!/usr/bin/env python3
"""Validate a Cursor skill directory after conversion."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate a Cursor skill directory.")
    parser.add_argument("--path", required=True, help="Path to .cursor/skills/<slug>")
    parser.add_argument("--json", action="store_true", help="Print JSON report")
    return parser.parse_args()


def frontmatter_field(text: str, key: str) -> str | None:
    match = re.search(rf"(?ms)^---\s*\n([\s\S]*?)\n---", text)
    if not match:
        return None
    raw = match.group(1)
    simple = re.search(rf"(?m)^{re.escape(key)}:\s*(.+)$", raw)
    if not simple:
        return None
    value = simple.group(1).strip()
    if value not in {">-", ">", "|", "|-", ">"}:
        return value.strip("\"'")
    # Folded/literal block: only indented continuation lines until the next top-level key.
    block = re.search(
        rf"(?ms)^{re.escape(key)}:\s*[>|]-?\s*\n((?:[ \t]+.*\n?)*)(?=^[A-Za-z0-9_-]+:|\Z)",
        raw,
    )
    if not block:
        return ""
    return " ".join(line.strip() for line in block.group(1).splitlines() if line.strip())


def main() -> None:
    args = parse_args()
    root = Path(args.path).expanduser().resolve()
    errors: list[str] = []
    warnings: list[str] = []
    if not root.is_dir():
        errors.append(f"Not a directory: {root}")
    skill_md = root / "SKILL.md"
    if not skill_md.is_file():
        errors.append("Missing SKILL.md")
        content = ""
    else:
        content = skill_md.read_text(encoding="utf-8")
    name = frontmatter_field(content, "name") if content else None
    description = frontmatter_field(content, "description") if content else None
    if not name:
        errors.append("Frontmatter name is required")
    elif not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", name or ""):
        errors.append(f"Invalid name slug: {name}")
    elif name != root.name:
        warnings.append(f"Directory name {root.name!r} != frontmatter name {name!r}")
    if not description:
        errors.append("Frontmatter description is required")
    elif len(description) > 1024:
        errors.append("Description exceeds 1024 characters")

    files = sorted(p.relative_to(root).as_posix() for p in root.rglob("*") if p.is_file())
    if len(files) < 1:
        errors.append("Skill directory has no files")

    report = {
        "ok": not errors,
        "path": str(root),
        "name": name,
        "fileCount": len(files),
        "files": files,
        "errors": errors,
        "warnings": warnings,
    }
    if args.json:
        print(json.dumps(report, indent=2))
    else:
        print(f"validate: {'OK' if report['ok'] else 'FAIL'} ({root})")
        print(f"files: {len(files)}")
        for err in errors:
            print(f"error: {err}", file=sys.stderr)
        for warn in warnings:
            print(f"warning: {warn}")
    raise SystemExit(0 if not errors else 1)


if __name__ == "__main__":
    main()
