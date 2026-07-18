import { compatibilityTargets, permissionKeys } from "./data";
import type { CompatibilityTarget, ParsedSkillImport, PermissionKey } from "./types";

const reservedSectionTitles = new Set([
  "overview", "activation", "required inputs", "workflow", "output contract",
  "available scripts", "references", "safety and permissions", "permissions",
  "failure handling", "gotchas", "examples", "validation", "compatibility", "notes",
]);

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64);
}

function humanizeName(value: string) {
  return value.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim().replace(/\b\w/g, (character) => character.toUpperCase());
}

function frontmatterBlock(skillMd: string) {
  return skillMd.match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1] ?? "";
}

function frontmatterValue(skillMd: string, key: string) {
  const block = frontmatterBlock(skillMd);
  const match = block.match(new RegExp(`^${key}:\\s*(.*)$`, "im"));
  if (!match) return "";
  const raw = match[1].trim();
  if (!/^[>|][+-]?$/.test(raw)) return raw.replace(/^["']|["']$/g, "");
  const lines: string[] = [];
  for (const line of block.slice((match.index ?? 0) + match[0].length).split(/\r?\n/).slice(1)) {
    if (line && !/^\s+/.test(line)) break;
    if (line.trim()) lines.push(line.trim());
  }
  return lines.join(raw.startsWith(">") ? " " : "\n");
}

function sectionContent(skillMd: string, heading: string) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = skillMd.match(new RegExp(`^##\\s+${escaped}\\s*$([\\s\\S]*?)(?=^##\\s+|(?![\\s\\S]))`, "im"));
  return match?.[1]?.trim() ?? "";
}

function hasSection(skillMd: string, heading: string) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^##\\s+${escaped}\\s*$`, "im").test(skillMd);
}

function displayTitle(skillMd: string, frontmatterName: string) {
  const titles = [...skillMd.matchAll(/^#\s+(.+)$/gm)].map((match) => match[1].trim());
  const title = titles.find((candidate) => !reservedSectionTitles.has(candidate.toLowerCase()));
  return title || (frontmatterName ? humanizeName(frontmatterName) : "Untitled Skill");
}

export function inferSkillTestPrompt(skillMd: string) {
  const examples = sectionContent(skillMd, "Examples");
  const firstExample = examples.match(/^\s*[-*]\s+(.+)$/m)?.[1]?.trim();
  if (firstExample) return firstExample.replace(/^["'`]|["'`]$/g, "").trim();
  const frontmatterName = frontmatterValue(skillMd, "name");
  const title = displayTitle(skillMd, frontmatterName);
  return title !== "Untitled Skill" ? `Use ${title} for a realistic example task.` : "Run this skill on a realistic example task.";
}

export function parseSkillMarkdown(skillMd: string): ParsedSkillImport {
  const frontmatterName = frontmatterValue(skillMd, "name");
  const name = displayTitle(skillMd, frontmatterName);
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
  if (!/^#\s+.+$/m.test(skillMd) || reservedSectionTitles.has((skillMd.match(/^#\s+(.+)$/m)?.[1] ?? "").trim().toLowerCase())) {
    issues.push("Missing human-readable top-level title.");
    suggestions.push("Add one H1 title for the skill name; use H2 headings for body sections.");
  }
  if (!description || description === "Imported agent skill package.") {
    issues.push("Missing frontmatter description.");
    suggestions.push("Add a one-sentence description to frontmatter.");
  }
  for (const section of ["Workflow", "Safety and Permissions", "Examples"]) {
    if (!hasSection(skillMd, section) && !(section === "Safety and Permissions" && hasSection(skillMd, "Permissions"))) {
      issues.push(`Missing ## ${section} section.`);
      suggestions.push(`Add a ${section === "Workflow" ? "numbered workflow" : section.toLowerCase()} section.`);
    }
  }

  const category = inferCategory(lower);
  const normalizedPermissions = permissions.length ? permissions : (["read_files"] satisfies PermissionKey[]);
  const normalizedTargets = targets.length ? targets : (["Codex", "Claude", "VS Code"] satisfies CompatibilityTarget[]);
  return {
    name,
    description,
    slug: slugify(frontmatterName || name) || "imported-skill",
    category,
    permissions: normalizedPermissions,
    compatibilityTargets: normalizedTargets,
    issues,
    suggestions,
    suggestedSkillMd: buildSuggestedSkillMarkdown(skillMd, {
      name, description, permissions: normalizedPermissions, compatibilityTargets: normalizedTargets,
    }),
  };
}

function buildSuggestedSkillMarkdown(skillMd: string, parsed: { name: string; description: string; permissions: PermissionKey[]; compatibilityTargets: CompatibilityTarget[] }) {
  const workflow = sectionContent(skillMd, "Workflow") || "1. Confirm the request matches this skill.\n2. Inspect the relevant context.\n3. Execute only approved operations.\n4. Validate and return the requested artifacts.";
  const permissions = sectionContent(skillMd, "Safety and Permissions") || sectionContent(skillMd, "Permissions") || parsed.permissions.map((permission) => `- ${permission}: Required for this skill's workflow.`).join("\n");
  const examples = sectionContent(skillMd, "Examples") || `- \"Use ${parsed.name} on a realistic task and produce the expected artifact.\"`;
  const compatibility = sectionContent(skillMd, "Compatibility") || parsed.compatibilityTargets.map((target) => `- ${target}`).join("\n");
  return `---\nname: ${slugify(parsed.name)}\ndescription: ${parsed.description}\n---\n\n# ${parsed.name}\n\n## Workflow\n${workflow}\n\n## Safety and Permissions\n${permissions}\n\n## Examples\n${examples}\n\n## Compatibility\n${compatibility}\n`;
}

function inferCategory(lower: string) {
  if (/\b(marketing|social media|instagram|tiktok|facebook|content calendar|campaign|ecommerce|e-commerce)\b/.test(lower)) return "Marketing";
  if (/\b(rag|retrieval|citation)\b/.test(lower)) return "Retrieval";
  if (/\b(code review|pull request|merge request|review a diff|git diff)\b/.test(lower)) return "Code Review";
  if (/\b(trace|tracing|observability|telemetry)\b/.test(lower)) return "Observability";
  if (/\b(incident|postmortem|reliability|outage)\b/.test(lower)) return "Reliability";
  if (/\b(research|source analysis|literature review)\b/.test(lower)) return "Research";
  if (/\b(security|vulnerability|threat|compliance)\b/.test(lower)) return "Security";
  return "Automation";
}
