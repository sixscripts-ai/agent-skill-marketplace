import { latestVersion } from "./data";
import type { Skill, SkillRun, WorkspaceFile } from "./types";

const TEXT_ROLES = new Set(["skill_md", "readme", "script", "reference", "config", "doc", "example", "other"]);

export function createPendingRun(skill: Skill, workspaceFiles: WorkspaceFile[] = [], replayOf?: string): SkillRun {
  const version = latestVersion(skill);
  return {
    id: `${skill.slug}-pending`,
    skillSlug: skill.slug,
    skillName: skill.name,
    version: version.version,
    input: "",
    status: "pending",
    output: "",
    latencyMs: 0,
    estimatedCost: 0,
    provider: "local",
    model: "vercel-sandbox/node24",
    replayOf,
    workspaceFiles,
    artifacts: [],
    events: [],
    createdAt: new Date().toISOString(),
  };
}

export function workspaceFilesFromSkillPackages(skill: Skill): WorkspaceFile[] {
  const packageFiles = skill.packages?.flatMap((pkg) => pkg.files) ?? [];
  const seen = new Set<string>();
  return packageFiles
    .filter((file) => TEXT_ROLES.has(file.role) && typeof file.content === "string" && !file.content.startsWith("data:"))
    .filter((file) => {
      if (seen.has(file.path)) return false;
      seen.add(file.path);
      return true;
    })
    .slice(0, 30)
    .map((file) => ({
      path: file.path,
      content: file.content ?? "",
      size: file.size,
      updatedAt: new Date().toISOString(),
    }));
}

export function detectRunnableCommands(skill: Skill, workspaceFiles: WorkspaceFile[] = []) {
  const files = [
    ...(skill.packages?.flatMap((pkg) => pkg.files.map((file) => ({ path: file.path, content: file.content ?? "" }))) ?? []),
    ...workspaceFiles.map((file) => ({ path: file.path, content: file.content })),
  ];
  const commands: string[] = [];
  const packageJson = files.find((file) => file.path.endsWith("package.json"));
  if (packageJson?.content) {
    try {
      const parsed = JSON.parse(packageJson.content) as { scripts?: Record<string, string>; main?: string };
      if (parsed.scripts?.test) commands.push("npm test");
      if (parsed.scripts?.build) commands.push("npm run build");
      if (parsed.scripts?.start) commands.push("npm start");
      if (parsed.main) commands.push(`node ${parsed.main}`);
    } catch {
      // Invalid package.json should not block manual command entry.
    }
  }

  for (const file of files) {
    if (file.path.endsWith(".sh")) commands.push(`bash ${file.path}`);
    if (file.path.endsWith(".mjs") || file.path.endsWith(".js")) commands.push(`node ${file.path}`);
    if (file.path.endsWith(".py")) commands.push(`python3 ${file.path}`);
  }

  return [...new Set(commands)].slice(0, 8);
}
