import { compatibilityTargets, permissionKeys } from "./data";
import type { CompatibilityTarget, ParsedSkillImport, PermissionKey } from "./types";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function frontmatterValue(skillMd: string, key: string) {
  const match = skillMd.match(new RegExp(`^${key}:\\s*(.+)$`, "im"));
  return match?.[1]?.replace(/^["']|["']$/g, "").trim() ?? "";
}

export function parseSkillMarkdown(skillMd: string): ParsedSkillImport {
  const title = skillMd.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? "";
  const name = frontmatterValue(skillMd, "name") || title || "Untitled Skill";
  const description = frontmatterValue(skillMd, "description") || "Imported agent skill package.";
  const lower = skillMd.toLowerCase();
  const permissions = permissionKeys.filter((permission) => lower.includes(permission));
  const targets = compatibilityTargets.filter((target) => lower.includes(target.toLowerCase()));
  const issues: string[] = [];

  if (!skillMd.trim().startsWith("---")) issues.push("Missing frontmatter block.");
  if (!title) issues.push("Missing top-level # title.");
  if (!frontmatterValue(skillMd, "description")) issues.push("Missing frontmatter description.");
  if (!lower.includes("## workflow")) issues.push("Missing ## Workflow section.");
  if (!lower.includes("## permissions")) issues.push("Missing ## Permissions section.");
  if (!lower.includes("## examples")) issues.push("Missing ## Examples section.");

  return {
    name,
    description,
    slug: slugify(name) || "imported-skill",
    category: inferCategory(lower),
    permissions: permissions.length ? permissions : (["read_files"] satisfies PermissionKey[]),
    compatibilityTargets: targets.length ? targets : (["Codex", "Claude", "VS Code"] satisfies CompatibilityTarget[]),
    issues,
  };
}

function inferCategory(lower: string) {
  if (lower.includes("rag") || lower.includes("retrieval") || lower.includes("citation")) return "Retrieval";
  if (lower.includes("review") || lower.includes("diff") || lower.includes("pr")) return "Code Review";
  if (lower.includes("trace") || lower.includes("observability")) return "Observability";
  if (lower.includes("incident") || lower.includes("postmortem")) return "Reliability";
  if (lower.includes("research") || lower.includes("source")) return "Research";
  return "Automation";
}
