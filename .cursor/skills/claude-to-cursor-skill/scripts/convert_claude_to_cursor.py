#!/usr/bin/env python3
"""Convert a Claude skill directory into a Cursor skill directory (full tree)."""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import sys
from pathlib import Path

SKIP_NAMES = {".DS_Store", "Thumbs.db", ".git"}
SECRET_NAMES = {".env", ".env.local", ".env.production", "credentials.json", "secrets.json"}
CURSOR_FRONTMATTER_KEYS = ("name", "description", "disable-model-invocation", "license", "compatibility", "metadata")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Convert Claude skills to Cursor skills (entire directory).")
    parser.add_argument("--source", required=True, help="Path to Claude skill directory")
    parser.add_argument("--dest-root", required=True, help="Destination skills root (.cursor/skills or ~/.cursor/skills)")
    parser.add_argument("--name", help="Override output skill directory / frontmatter name")
    parser.add_argument("--force", action="store_true", help="Overwrite existing destination skill")
    parser.add_argument("--keep-secrets", action="store_true", help="Allow copying .env / credential filenames")
    parser.add_argument("--json", action="store_true", help="Print machine-readable report")
    return parser.parse_args()


def die(message: str, code: int = 1) -> None:
    print(f"error: {message}", file=sys.stderr)
    raise SystemExit(code)


def slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-{2,}", "-", value).strip("-")
    return value or "untitled-skill"


def split_frontmatter(text: str) -> tuple[dict[str, object], str]:
    if not text.startswith("---"):
        return {}, text
    match = re.match(r"^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$", text)
    if not match:
        return {}, text
    raw, body = match.group(1), match.group(2)
    data: dict[str, object] = {}
    current_key: str | None = None
    current_obj: dict[str, object] | None = None
    for line in raw.splitlines():
        if re.match(r"^[A-Za-z0-9_-]+:\s*$", line):
            current_key = line[:-1]
            current_obj = {}
            data[current_key] = current_obj
            continue
        nested = re.match(r"^\s+([A-Za-z0-9_-]+):\s*(.*)$", line)
        if nested and current_obj is not None:
            current_obj[nested.group(1)] = nested.group(2).strip().strip("\"'")
            continue
        simple = re.match(r"^([A-Za-z0-9_-]+):\s*(.*)$", line)
        if simple:
            current_key = None
            current_obj = None
            key, value = simple.group(1), simple.group(2).strip()
            if value.startswith(">") or value == "|":
                data[key] = ""
            else:
                data[key] = value.strip("\"'")
            continue
        if current_key and isinstance(data.get(current_key), str) and line.strip():
            data[current_key] = f"{data[current_key]} {line.strip()}".strip()
    return data, body


def dump_frontmatter(data: dict[str, object]) -> str:
    lines = ["---"]
    for key in CURSOR_FRONTMATTER_KEYS:
        if key not in data:
            continue
        value = data[key]
        if isinstance(value, dict):
            # Keep only scalar nested metadata for Cursor portability.
            scalars = {k: v for k, v in value.items() if isinstance(v, (str, int, float, bool))}
            if not scalars:
                continue
            lines.append(f"{key}:")
            for nested_key, nested_value in scalars.items():
                lines.append(f"  {nested_key}: {nested_value}")
            continue
        text = " ".join(str(value).split())
        lines.append(f"{key}: {text}")
    lines.append("---")
    return "\n".join(lines) + "\n"


def resolve_skill_root(source: Path) -> Path:
    if (source / "SKILL.md").is_file():
        return source
    if (source / "upstream" / "SKILL.md").is_file():
        return source
    die(f"No SKILL.md found under {source} (checked ./SKILL.md and ./upstream/SKILL.md)")


def collect_files(skill_root: Path) -> list[Path]:
    """Prefer overlay files at root; fill gaps from upstream/."""
    files: dict[str, Path] = {}
    upstream = skill_root / "upstream"
    if upstream.is_dir():
        for path in upstream.rglob("*"):
            if path.is_file():
                rel = path.relative_to(upstream).as_posix()
                files[rel] = path
    for path in skill_root.rglob("*"):
        if not path.is_file():
            continue
        rel = path.relative_to(skill_root).as_posix()
        if rel == "overlay.yaml" or rel.startswith("upstream/"):
            continue
        files[rel] = path
    return [files[key] for key in sorted(files)]


def rewrite_skill_md(content: str, name: str) -> tuple[str, dict[str, object]]:
    meta, body = split_frontmatter(content)
    description = str(meta.get("description") or "").strip()
    if not description:
        description = f"Converted Cursor skill for {name}."
    # Cursor descriptions are capped at 1024 chars.
    if len(description) > 1024:
        description = description[:1021].rstrip() + "..."
    out: dict[str, object] = {
        "name": name,
        "description": description,
    }
    if "disable-model-invocation" in meta:
        out["disable-model-invocation"] = meta["disable-model-invocation"]
    if "license" in meta:
        out["license"] = meta["license"]
    if "compatibility" in meta:
        out["compatibility"] = meta["compatibility"]
    if isinstance(meta.get("metadata"), dict):
        out["metadata"] = meta["metadata"]
    return dump_frontmatter(out) + body.lstrip("\n"), out


def safe_rel(path: Path, root: Path) -> str:
    rel = path.relative_to(root).as_posix()
    if ".." in rel.split("/") or rel.startswith("/") or any(ch in rel for ch in "\0;$`|"):
        die(f"Unsafe path rejected: {rel}")
    return rel


def main() -> None:
    args = parse_args()
    source = Path(args.source).expanduser().resolve()
    dest_root = Path(args.dest_root).expanduser().resolve()
    if not source.is_dir():
        die(f"Source is not a directory: {source}")
    if dest_root.name == "skills-cursor" or dest_root.as_posix().endswith("/.cursor/skills-cursor"):
        die("Refusing to write into Cursor built-in skills-cursor directory")

    skill_root = resolve_skill_root(source)
    skill_md_path = skill_root / "SKILL.md"
    if not skill_md_path.is_file():
        skill_md_path = skill_root / "upstream" / "SKILL.md"
    original = skill_md_path.read_text(encoding="utf-8")
    meta, _ = split_frontmatter(original)
    name = slugify(args.name or str(meta.get("name") or skill_root.name))
    dest = dest_root / name
    if dest.exists() and not args.force:
        die(f"Destination exists (pass --force): {dest}")
    if dest.exists() and args.force:
        shutil.rmtree(dest)
    dest.mkdir(parents=True, exist_ok=True)

    copied: list[str] = []
    skipped: list[str] = []
    for path in collect_files(skill_root):
        if path.name in SKIP_NAMES:
            skipped.append(path.name)
            continue
        if path.name in SECRET_NAMES and not args.keep_secrets:
            skipped.append(path.as_posix())
            continue
        if "upstream" in path.parts and (skill_root / "upstream") in path.parents:
            rel = path.relative_to(skill_root / "upstream").as_posix()
        else:
            rel = safe_rel(path, skill_root)
        if rel.startswith("upstream/"):
            continue
        target = dest / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        if path.name == "SKILL.md" and Path(rel).name == "SKILL.md":
            rewritten, _ = rewrite_skill_md(path.read_text(encoding="utf-8"), name)
            target.write_text(rewritten, encoding="utf-8")
        else:
            shutil.copy2(path, target)
        copied.append(rel)

    if "SKILL.md" not in copied:
        die("Conversion produced no SKILL.md")

    report = {
        "ok": True,
        "source": str(source),
        "destination": str(dest),
        "name": name,
        "copied": copied,
        "skipped": skipped,
        "fileCount": len(copied),
    }
    if args.json:
        print(json.dumps(report, indent=2))
    else:
        print(f"Converted {source} -> {dest}")
        print(f"name: {name}")
        print(f"files: {len(copied)}")
        for item in copied:
            print(f"  + {item}")
        if skipped:
            print("skipped:")
            for item in skipped:
                print(f"  - {item}")


if __name__ == "__main__":
    main()
