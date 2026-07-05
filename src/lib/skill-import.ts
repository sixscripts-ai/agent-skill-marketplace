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

function sectionContent(skillMd: string, heading: string) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = skillMd.match(new RegExp(`^##\\s+${escaped}\\s*$([\\s\\S]*?)(?=^##\\s+|(?![\\s\\S]))`, "im"));
  return match?.[1]?.trim() ?? "";
}

function hasSection(lower: string, heading: string) {
  return lower.includes(`## ${heading.toLowerCase()}`);
}

export function parseSkillMarkdown(skillMd: string): ParsedSkillImport {
  const title = skillMd.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? "";
  const name = frontmatterValue(skillMd, "name") || title || "Untitled Skill";
  const description = frontmatterValue(skillMd, "description") || "Imported agent skill package.";
  const lower = skillMd.toLowerCase();
  const permissions = permissionKeys.filter((permission) => lower.includes(permission));
  const targets = compatibilityTargets.filter((target) => lower.includes(target.toLowerCase()));
  const issues: string[] = [];
  const suggestions: string[] = [];

  if (!skillMd.trim().startsWith("---")) {
    issues.push("Missing frontmatter block.");
    suggestions.push("Add YAML frontmatter with name and description.");
  }
  if (!title) {
    issues.push("Missing top-level # title.");
    suggestions.push("Add a top-level title that matches the skill name.");
  }
  if (!frontmatterValue(skillMd, "description")) {
    issues.push("Missing frontmatter description.");
    suggestions.push("Add a one-sentence description to frontmatter.");
  }
  if (!hasSection(lower, "workflow")) {
    issues.push("Missing ## Workflow section.");
    suggestions.push("Add a numbered workflow so agents know the operating sequence.");
  }
  if (!hasSection(lower, "permissions")) {
    issues.push("Missing ## Permissions section.");
    suggestions.push("List required permissions and explain why each one is needed.");
  }
  if (!hasSection(lower, "examples")) {
    issues.push("Missing ## Examples section.");
    suggestions.push("Add realistic input examples for when the skill should be used.");
  }

  const category = inferCategory(lower);
  const normalizedPermissions = permissions.length ? permissions : (["read_files"] satisfies PermissionKey[]);
  const normalizedTargets = targets.length ? targets : (["Codex", "Claude", "VS Code"] satisfies CompatibilityTarget[]);
  return {
    name,
    description,
    slug: slugify(name) || "imported-skill",
    category,
    permissions: normalizedPermissions,
    compatibilityTargets: normalizedTargets,
    issues,
    suggestions,
    suggestedSkillMd: buildSuggestedSkillMarkdown(skillMd, {
      name,
      description,
      permissions: normalizedPermissions,
      compatibilityTargets: normalizedTargets,
    }),
  };
}

function buildSuggestedSkillMarkdown(
  skillMd: string,
  parsed: {
    name: string;
    description: string;
    permissions: PermissionKey[];
    compatibilityTargets: CompatibilityTarget[];
  },
) {
  const workflow =
    sectionContent(skillMd, "Workflow") ||
    "1. Read the user's request and confirm the task matches this skill.\n2. Inspect the relevant files, docs, or context.\n3. Execute the workflow using only approved tools and permissions.\n4. Return a concise final answer with artifacts, warnings, and next steps.";
  const permissions =
    sectionContent(skillMd, "Permissions") ||
    parsed.permissions.map((permission) => `- ${permission}: Required for this skill's normal workflow.`).join("\n");
  const examples =
    sectionContent(skillMd, "Examples") ||
    `- "Use ${parsed.name} on this task and produce the expected artifact."\n- "Run this skill against the attached project context and summarize risks."`;
  const compatibility =
    sectionContent(skillMd, "Compatibility") ||
    parsed.compatibilityTargets.map((target) => `- ${target}`).join("\n");
  const notes = sectionContent(skillMd, "Notes");

  return `---
name: ${parsed.name}
description: ${parsed.description}
---

# ${parsed.name}

${parsed.description}

## Workflow
${workflow}

## Permissions
${permissions}

## Examples
${examples}

## Compatibility
${compatibility}${notes ? `\n\n## Notes\n${notes}` : ""}
`;
}

function inferCategory(lower: string) {
  if (lower.includes("rag") || lower.includes("retrieval") || lower.includes("citation")) return "Retrieval";
  if (lower.includes("review") || lower.includes("diff") || lower.includes("pr")) return "Code Review";
  if (lower.includes("trace") || lower.includes("observability")) return "Observability";
  if (lower.includes("incident") || lower.includes("postmortem")) return "Reliability";
  if (lower.includes("research") || lower.includes("source")) return "Research";
  return "Automation";
}
