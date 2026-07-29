import { latestVersion } from "./data";
import { isSafeCommandPath, quoteShellArg } from "./sandbox-security";
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
  const fromPackages = packageFiles
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
  if (fromPackages.length) return fromPackages;

  const version = skill.versions?.find((item) => item.version === skill.currentVersion) ?? skill.versions?.[0];
  if (!version?.skillMd?.trim()) return [];
  const fallback: WorkspaceFile[] = [
    {
      path: "SKILL.md",
      content: version.skillMd,
      size: Buffer.byteLength(version.skillMd),
      updatedAt: new Date().toISOString(),
    },
  ];
  if (version.readme?.trim()) {
    fallback.push({
      path: "README.md",
      content: version.readme,
      size: Buffer.byteLength(version.readme),
      updatedAt: new Date().toISOString(),
    });
  }
  return fallback;
}

export function detectRunnableCommands(skill: Skill, workspaceFiles: WorkspaceFile[] = []) {
  const files = [
    ...(skill.packages?.flatMap((pkg) => pkg.files.map((file) => ({ path: file.path, content: file.content ?? "" }))) ?? []),
    ...workspaceFiles.map((file) => ({ path: file.path, content: file.content })),
  ];
  const paths = files.map((file) => file.path);
  const scored: Array<{ command: string; score: number }> = [];
  const packageJson = files.find((file) => file.path.endsWith("package.json"));
  if (packageJson?.content) {
    try {
      const parsed = JSON.parse(packageJson.content) as { scripts?: Record<string, string>; main?: string };
      if (parsed.scripts?.test) scored.push({ command: "npm test", score: 100 });
      if (parsed.scripts?.build) scored.push({ command: "npm run build", score: 90 });
      if (parsed.scripts?.start) scored.push({ command: "npm start", score: 80 });
      if (parsed.main && isSafeCommandPath(parsed.main)) {
        scored.push({ command: `node ${quoteShellArg(parsed.main)}`, score: 70 });
      }
    } catch {
      // Invalid package.json should not block manual command entry.
    }
  }

  for (const file of files) {
    if (!isSafeCommandPath(file.path)) continue;
    const quotedPath = quoteShellArg(file.path);
    if (file.path.endsWith(".sh")) {
      scored.push({ command: `bash ${quotedPath}`, score: commandPathScore(file.path) });
    }
    if (file.path.endsWith(".mjs") || file.path.endsWith(".js")) {
      scored.push({ command: `node ${quotedPath}`, score: commandPathScore(file.path) });
    }
    if (file.path.endsWith(".py")) {
      const command = pythonCommandWithDefaults(file.path, file.content, paths);
      if (command) scored.push({ command, score: commandPathScore(file.path) });
    }
  }

  scored.sort((a, b) => b.score - a.score || a.command.localeCompare(b.command));
  return [...new Set(scored.map((item) => item.command))].slice(0, 8);
}

function commandPathScore(path: string) {
  let score = 20;
  if (/(^|\/)scripts\//.test(path) && !/\/examples\//.test(path)) score += 40;
  if (/\/examples\//.test(path)) score -= 25;
  if (/validate|convert|build|test/.test(path)) score += 10;
  if (/fetch_headers|sample-/.test(path)) score -= 10;
  return score;
}

function pythonCommandWithDefaults(path: string, content: string, paths: string[]) {
  const requiredFlags = [
    ...content.matchAll(/add_argument\(\s*["'](--[\w-]+)["'][\s\S]*?required\s*=\s*True/g),
  ].map((match) => match[1]);
  const uniqueRequired = [...new Set(requiredFlags)];
  const args: string[] = [];

  for (const flag of uniqueRequired) {
    if (flag === "--url") {
      args.push("--url", "https://example.com");
      continue;
    }
    if (flag === "--source") {
      const source =
        paths.find((item) => /examples\/.*claude/i.test(item) && item.endsWith("SKILL.md"))?.replace(/\/SKILL\.md$/, "") ??
        paths.find((item) => item.endsWith("SKILL.md") && item.includes("/"))?.replace(/\/SKILL\.md$/, "");
      if (!source || !isSafeCommandPath(source)) return null;
      args.push("--source", source);
      continue;
    }
    if (flag === "--dest-root") {
      args.push("--dest-root", "/tmp/asm-cursor-skills");
      continue;
    }
    if (flag === "--path") {
      const target =
        paths.find((item) => /examples\/.*cursor/i.test(item) && item.endsWith("SKILL.md"))?.replace(/\/SKILL\.md$/, "") ??
        ".";
      if (!isSafeCommandPath(target)) return null;
      args.push("--path", target);
      continue;
    }
    return null;
  }

  if (content.includes("--force") && args.includes("--dest-root")) args.push("--force");
  const quotedArgs = args.map((arg) => (arg.startsWith("-") ? arg : quoteShellArg(arg)));
  return `python3 ${quoteShellArg(path)}${quotedArgs.length ? ` ${quotedArgs.join(" ")}` : ""}`;
}
