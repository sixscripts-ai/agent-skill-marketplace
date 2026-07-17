import { inferSkillTestPrompt, parseSkillMarkdown } from "./skill-import";
import type { CompatibilityTarget, PermissionKey, SkillPackageFile, SkillPackageFileRole } from "./types";

export const FULL_PACKAGE_PROFILE_ID = "agent-skill-marketplace-full-package-v1";
export const FULL_PACKAGE_PROFILE_LABEL = "Agent Skill Marketplace Full Package Profile v1";

export const FULL_PACKAGE_REQUIRED_SECTIONS = [
  "Overview",
  "Activation",
  "Required Inputs",
  "Workflow",
  "Output Contract",
  "Available Scripts",
  "References",
  "Safety and Permissions",
  "Failure Handling",
  "Gotchas",
  "Examples",
  "Validation",
  "Compatibility",
] as const;

const allowedPermissions = new Set<PermissionKey>([
  "read_files",
  "write_files",
  "network",
  "shell",
  "browser",
  "api_keys",
]);
const allowedTargets = new Set<CompatibilityTarget>([
  "Codex",
  "Claude",
  "Antigravity",
  "OpenCode",
  "Grok",
  "VS Code",
]);

export type GeneratedSkillMetadata = {
  displayName?: string;
  directoryName?: string;
  category?: string;
  summary?: string;
  testPrompt?: string;
  permissions?: string[];
  targets?: string[];
};

export type GeneratedSkillFileInput = {
  path: string;
  content: string;
  role?: SkillPackageFileRole;
};

export type FullPackageProfileReport = {
  id: typeof FULL_PACKAGE_PROFILE_ID;
  label: typeof FULL_PACKAGE_PROFILE_LABEL;
  valid: boolean;
  directoryName: string;
  errors: string[];
  warnings: string[];
  fileCount: number;
};

export function buildFullSkillPackage(input: {
  skillMd: string;
  files?: Array<GeneratedSkillFileInput | SkillPackageFile>;
  metadata?: GeneratedSkillMetadata;
}) {
  const parsed = parseSkillMarkdown(input.skillMd);
  const directoryName = slugify(input.metadata?.directoryName || parsed.slug || parsed.name) || "untitled-skill";
  const map = new Map<string, SkillPackageFile>();

  for (const file of input.files ?? []) {
    const path = normalizePath(file.path, directoryName);
    if (!path || path === "SKILL.md") continue;
    const content = "content" in file ? file.content : undefined;
    map.set(path, {
      path,
      content,
      blobUrl: "blobUrl" in file ? file.blobUrl : undefined,
      mimeType: "mimeType" in file && file.mimeType ? file.mimeType : mimeType(path),
      size: "size" in file && Number.isFinite(file.size) ? file.size : byteLength(content ?? ""),
      role: "role" in file && file.role ? file.role : roleForPath(path),
    });
  }

  map.set("SKILL.md", textFile("SKILL.md", input.skillMd, "skill_md"));
  if (!map.has("references/REFERENCE.md")) {
    map.set(
      "references/REFERENCE.md",
      textFile(
        "references/REFERENCE.md",
        "# Skill References\n\nAdd focused reference files here. Document the exact condition that should cause an agent to load each file.\n",
        "reference",
      ),
    );
  }
  for (const directory of ["scripts", "assets", "examples"] as const) {
    if (![...map.keys()].some((path) => path.startsWith(`${directory}/`))) {
      map.set(`${directory}/.gitkeep`, textFile(`${directory}/.gitkeep`, "", roleForPath(`${directory}/.gitkeep`)));
    }
  }

  const files = [...map.values()].sort((a, b) => a.path.localeCompare(b.path));
  const permissions = normalizeValues(input.metadata?.permissions, parsed.permissions, allowedPermissions, ["read_files"]);
  const targets = normalizeValues(input.metadata?.targets, parsed.compatibilityTargets, allowedTargets, ["Codex", "Claude", "VS Code"]);
  const profile = validateFullSkillPackage({ skillMd: input.skillMd, directoryName, files });
  const metadata = {
    displayName: input.metadata?.displayName?.trim() || parsed.name,
    directoryName,
    category: input.metadata?.category?.trim() || parsed.category,
    summary: input.metadata?.summary?.trim() || parsed.description,
    testPrompt: input.metadata?.testPrompt?.trim() || inferSkillTestPrompt(input.skillMd),
    permissions,
    targets,
  };

  return {
    skillMd: input.skillMd,
    files,
    metadata,
    profile,
    manifest: {
      profileId: FULL_PACKAGE_PROFILE_ID,
      profileLabel: FULL_PACKAGE_PROFILE_LABEL,
      directoryName,
      primarySkillPath: "SKILL.md",
      files: files.map(({ path, role, size }) => ({ path, role, size })),
      validation: { valid: profile.valid, errors: profile.errors, warnings: profile.warnings },
    },
  };
}

export function validateFullSkillPackage(input: {
  skillMd: string;
  directoryName: string;
  files: SkillPackageFile[];
}): FullPackageProfileReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const name = frontmatterValue(input.skillMd, "name");
  const description = frontmatterValue(input.skillMd, "description");
  const paths = new Set(input.files.map((file) => normalizePath(file.path, input.directoryName)).filter(Boolean));

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.directoryName)) errors.push("Directory name must be lowercase and hyphenated.");
  if (name !== input.directoryName) errors.push(`Frontmatter name must exactly match the directory name: ${input.directoryName}.`);
  if (!description) errors.push("Frontmatter description is required.");
  if (description && description.length > 1024) errors.push("Description must be 1024 characters or fewer.");
  if (description && !/^use this skill when\b/i.test(description)) errors.push('Description must begin with "Use this skill when...".');
  for (const key of ["license", "compatibility", "allowed-tools"]) {
    if (!frontmatterValue(input.skillMd, key)) errors.push(`Frontmatter must include ${key}.`);
  }
  if (!/^metadata:\s*$/im.test(input.skillMd) || !/^\s+author:\s*.+$/im.test(input.skillMd) || !/^\s+version:\s*.+$/im.test(input.skillMd)) {
    errors.push("Frontmatter metadata must include author and version.");
  }
  if (input.skillMd.split(/\r?\n/).length > 500) errors.push("SKILL.md must remain under 500 lines.");
  for (const section of FULL_PACKAGE_REQUIRED_SECTIONS) {
    if (!new RegExp(`^##\\s+${escapeRegExp(section)}\\s*$`, "im").test(input.skillMd)) errors.push(`SKILL.md must include ## ${section}.`);
  }
  if (!paths.has("SKILL.md")) errors.push("Package must include SKILL.md at its root.");
  for (const directory of ["scripts", "references", "assets", "examples"]) {
    if (![...paths].some((path) => path.startsWith(`${directory}/`))) errors.push(`Package must scaffold ${directory}/.`);
  }
  if (!paths.has("references/REFERENCE.md")) errors.push("Package must include references/REFERENCE.md.");

  const references = sectionContent(input.skillMd, "References");
  if (references && !/read\s+[`\"]?references\/[^\s`\"]+[`\"]?\s+(?:if|when)\b/i.test(references)) {
    errors.push("References must state exact load conditions.");
  }
  for (const file of input.files) {
    const path = normalizePath(file.path, input.directoryName);
    if (!path) errors.push(`Unsafe package path: ${file.path}.`);
    if (path.startsWith("references/") && path.split("/").length > 2) errors.push(`Reference files must stay one level deep: ${path}.`);
    if (file.role === "script" && file.content && /\binput\s*\(|\bread\s+-p\b|prompt\s*\(/i.test(file.content)) {
      errors.push(`Scripts must use CLI flags instead of interactive prompts: ${path}.`);
    }
  }
  if (!input.files.some((file) => file.path.startsWith("scripts/") && !file.path.endsWith(".gitkeep"))) warnings.push("scripts/ is scaffolded but contains no executable helper yet.");
  if (!input.files.some((file) => file.path.startsWith("examples/") && !file.path.endsWith(".gitkeep"))) warnings.push("examples/ is scaffolded but contains no reference implementation yet.");

  return {
    id: FULL_PACKAGE_PROFILE_ID,
    label: FULL_PACKAGE_PROFILE_LABEL,
    valid: errors.length === 0,
    directoryName: input.directoryName,
    errors,
    warnings,
    fileCount: input.files.length,
  };
}

function normalizeValues<T extends string>(requested: string[] | undefined, fallback: T[], allowed: Set<T>, defaults: T[]): T[] {
  const values = (requested ?? fallback).filter((value): value is T => allowed.has(value as T));
  return [...new Set(values.length ? values : fallback.length ? fallback : defaults)];
}

function textFile(path: string, content: string, role: SkillPackageFileRole): SkillPackageFile {
  return { path, content, mimeType: mimeType(path), size: byteLength(content), role };
}

function normalizePath(value: string, root: string) {
  const parts = value.replaceAll("\\", "/").replace(/^\/+/, "").split("/").filter(Boolean);
  if (parts[0] === root) parts.shift();
  if (!parts.length || parts.some((part) => part === ".." || (part.startsWith(".") && part !== ".gitkeep"))) return "";
  return parts.join("/");
}

function roleForPath(path: string): SkillPackageFileRole {
  const lower = path.toLowerCase();
  if (lower === "skill.md") return "skill_md";
  if (lower.startsWith("scripts/")) return "script";
  if (lower.startsWith("references/")) return "reference";
  if (lower.startsWith("assets/")) return "asset";
  if (lower.startsWith("examples/")) return "example";
  if (lower.endsWith(".md")) return "doc";
  return "other";
}

function frontmatterValue(markdown: string, key: string) {
  const match = markdown.match(new RegExp(`^${key}:\\s*(.*)$`, "im"));
  if (!match) return "";
  const raw = match[1].trim();
  if (!/^[>|][+-]?$/.test(raw)) return raw.replace(/^["']|["']$/g, "");
  const lines: string[] = [];
  for (const line of markdown.slice((match.index ?? 0) + match[0].length).split(/\r?\n/).slice(1)) {
    if (line && !/^\s+/.test(line)) break;
    if (line.trim()) lines.push(line.trim());
  }
  return lines.join(raw.startsWith(">") ? " " : "\n");
}

function sectionContent(markdown: string, heading: string) {
  const match = markdown.match(new RegExp(`^##\\s+${escapeRegExp(heading)}\\s*$([\\s\\S]*?)(?=^##\\s+|$(?![\\s\\S]))`, "im"));
  return match?.[1]?.trim() ?? "";
}

function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64); }
function mimeType(path: string) { return path.endsWith(".md") ? "text/markdown" : path.endsWith(".json") ? "application/json" : "text/plain"; }
function byteLength(value: string) { return new TextEncoder().encode(value).byteLength; }
function escapeRegExp(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
