import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { demoUser } from "./auth";
import { getSkill, latestVersion, skills as seededSkills } from "./data";
import { parseSkillMarkdown } from "./skill-import";
import type {
  CompatibilityTarget,
  EvaluationSuite,
  MarketplaceState,
  MarketplaceUser,
  PackageExport,
  PermissionKey,
  Skill,
  SkillDraftInput,
  SkillRun,
  SkillTraceEvent,
} from "./types";

const dataDir = path.join(process.cwd(), ".local-data");
const dataFile = path.join(dataDir, "marketplace.json");

const initialState: MarketplaceState = {
  users: [demoUser],
  skills: seededSkills,
  runs: [],
  packageExports: [],
};

async function readState(): Promise<MarketplaceState> {
  try {
    const raw = await readFile(dataFile, "utf8");
    const parsed = JSON.parse(raw) as MarketplaceState;
    return {
      users: parsed.users?.length ? parsed.users : [demoUser],
      skills: parsed.skills?.length ? parsed.skills : seededSkills,
      runs: parsed.runs ?? [],
      packageExports: parsed.packageExports ?? [],
    };
  } catch {
    await writeState(initialState);
    return structuredClone(initialState);
  }
}

async function writeState(state: MarketplaceState) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(dataFile, JSON.stringify(state, null, 2));
}

export async function listVisibleSkills(user: MarketplaceUser = demoUser) {
  const state = await readState();
  return state.skills.filter(
    (skill) => skill.visibility !== "private" || skill.ownerId === user.id || user.role === "admin",
  );
}

export async function findSkill(slug: string, user: MarketplaceUser = demoUser) {
  const skills = await listVisibleSkills(user);
  return skills.find((skill) => skill.slug === slug || skill.id === slug);
}

export async function listRuns() {
  return (await readState()).runs;
}

export async function findRun(runId: string) {
  return (await readState()).runs.find((run) => run.id === runId);
}

export async function saveRun(run: SkillRun) {
  const state = await readState();
  state.runs = [run, ...state.runs.filter((item) => item.id !== run.id)].slice(0, 200);
  await writeState(state);
  return run;
}

export async function appendRunEvent(runId: string, event: SkillTraceEvent, output?: string, status?: SkillRun["status"]) {
  const state = await readState();
  const run = state.runs.find((item) => item.id === runId);
  if (!run) return;
  run.events = [...run.events.filter((item) => item.order !== event.order), event].sort((a, b) => a.order - b.order);
  if (output !== undefined) run.output = output;
  if (status) run.status = status;
  run.latencyMs = Math.max(run.latencyMs, Date.now() - Date.parse(run.createdAt));
  await writeState(state);
}

export async function createOrUpdateSkill(input: SkillDraftInput, user: MarketplaceUser = demoUser) {
  const state = await readState();
  const existing = state.skills.find((skill) => skill.slug === input.slug);
  const version = existing ? bumpPatch(existing.currentVersion) : "v0.1.0";
  const installTargets = buildInstallTargets(input.slug, input.name, input.compatibilityTargets);
  const parsed = parseSkillMarkdown(input.skillMd);
  const nextSkill: Skill = {
    id: existing?.id ?? `skill-${input.slug}`,
    slug: input.slug,
    name: input.name,
    summary: input.summary,
    category: input.category,
    trustLevel: existing?.trustLevel ?? "Experimental",
    author: user.name,
    ownerId: user.id,
    visibility: input.visibility,
    installCount: existing?.installCount ?? 0,
    rating: existing?.rating ?? 0,
    currentVersion: version,
    permissions: input.permissions.map((permission) => ({
      key: permission,
      reason: permissionReason(permission),
      risk: permission === "shell" || permission === "api_keys" ? "high" : permission === "network" || permission === "write_files" ? "medium" : "low",
    })),
    versions: [
      {
        version,
        skillMd: input.skillMd,
        readme: `# ${input.name}\n\n${input.summary}\n\nImported from SKILL.md with ${parsed.issues.length ? `${parsed.issues.length} validation warning(s)` : "no validation warnings"}.`,
        changelog: existing ? "Published from builder as a new version." : "Initial builder publication.",
        compatibilityTargets: input.compatibilityTargets,
        createdAt: new Date().toISOString().slice(0, 10),
      },
      ...(existing?.versions ?? []),
    ],
    evalSuites: existing?.evalSuites ?? [
      {
        name: "Draft Quality",
        cases: [
          {
            input: "Run the skill against a demo task.",
            expected: "Returns useful output with clear trace events.",
            assertionType: "usefulness",
            status: "pass",
          },
        ],
        results: [],
      },
    ],
    installTargets,
    reviews: existing?.reviews ?? [],
  };

  state.skills = [nextSkill, ...state.skills.filter((skill) => skill.slug !== input.slug)];
  await writeState(state);
  return nextSkill;
}

export async function forkSkill(skillSlug: string, user: MarketplaceUser = demoUser) {
  const state = await readState();
  const source = state.skills.find((skill) => skill.slug === skillSlug || skill.id === skillSlug);
  if (!source) throw new Error("Skill not found");

  const version = latestVersion(source);
  const forkSlug = uniqueSlug(
    state.skills.map((skill) => skill.slug),
    `${source.slug}-remix`,
  );
  const forkName = `${source.name} Remix`;
  const fork: Skill = {
    ...structuredClone(source),
    id: `skill-${forkSlug}`,
    slug: forkSlug,
    name: forkName,
    summary: `Remix of ${source.name}. ${source.summary}`,
    trustLevel: "Experimental",
    author: user.name,
    ownerId: user.id,
    visibility: "unlisted",
    installCount: 0,
    rating: 0,
    currentVersion: "v0.1.0",
    permissions: structuredClone(source.permissions),
    versions: [
      {
        version: "v0.1.0",
        skillMd: version.skillMd.replace(`# ${source.name}`, `# ${forkName}`),
        readme: `# ${forkName}\n\nForked from ${source.name}. Edit this remix, run it in the sandbox, then publish a hardened version.`,
        changelog: `Forked from ${source.slug}@${version.version}.`,
        compatibilityTargets: [...version.compatibilityTargets],
        createdAt: new Date().toISOString().slice(0, 10),
      },
    ],
    evalSuites: source.evalSuites.map((suite) => ({
      name: `${suite.name} Remix`,
      cases: structuredClone(suite.cases),
      results: [],
    })),
    installTargets: buildInstallTargets(forkSlug, forkName, version.compatibilityTargets),
    reviews: [],
  };

  state.skills = [fork, ...state.skills];
  await writeState(state);
  return fork;
}

export async function addEvalCase(skillSlug: string, suiteName: string, input: string, expected: string, assertionType: string) {
  const state = await readState();
  const skill = state.skills.find((item) => item.slug === skillSlug);
  if (!skill) throw new Error("Skill not found");
  let suite = skill.evalSuites.find((item) => item.name === suiteName);
  if (!suite) {
    suite = { name: suiteName, cases: [], results: [] };
    skill.evalSuites.push(suite);
  }
  suite.cases.push({ input, expected, assertionType, status: "pass" });
  await writeState(state);
  return suite;
}

export async function runEvalSuite(skillSlug: string, suiteName: string) {
  const state = await readState();
  const skill = state.skills.find((item) => item.slug === skillSlug);
  if (!skill) throw new Error("Skill not found");
  const suite = skill.evalSuites.find((item) => item.name === suiteName) ?? skill.evalSuites[0];
  if (!suite) throw new Error("Suite not found");
  const failed = suite.cases.filter((item) => item.status === "fail").length;
  const passed = suite.cases.length - failed;
  const score = suite.cases.length ? Math.round((passed / suite.cases.length) * 100) : 0;
  const result = {
    version: skill.currentVersion,
    score,
    passed,
    failed,
    regressions: failed > 0 ? 1 : 0,
    createdAt: new Date().toISOString().slice(0, 10),
  };
  suite.results = [result, ...suite.results].slice(0, 8);
  await writeState(state);
  return { suite, result };
}

export async function savePackageExport(skill: Skill, target: string, user: MarketplaceUser = demoUser) {
  const state = await readState();
  const version = latestVersion(skill);
  const record: PackageExport = {
    id: `export-${skill.slug}-${Date.now()}`,
    skillSlug: skill.slug,
    version: version.version,
    target,
    userId: user.id,
    createdAt: new Date().toISOString(),
    filename: `${skill.slug}-${version.version}.zip`,
  };
  state.packageExports = [record, ...state.packageExports].slice(0, 100);
  await writeState(state);
  return record;
}

function bumpPatch(version: string) {
  const match = version.match(/^v(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return "v0.1.0";
  return `v${match[1]}.${match[2]}.${Number(match[3]) + 1}`;
}

function uniqueSlug(existing: string[], base: string) {
  let candidate = base;
  let index = 2;
  while (existing.includes(candidate)) {
    candidate = `${base}-${index}`;
    index += 1;
  }
  return candidate;
}

function buildInstallTargets(slug: string, name: string, targets: CompatibilityTarget[]) {
  return targets.map((platform) => ({
    platform,
    installCommand:
      platform === "Codex"
        ? `mkdir -p ~/.codex/skills/${slug} && cp SKILL.md ~/.codex/skills/${slug}/SKILL.md`
        : platform === "Claude"
          ? `cp ${slug}.md .claude/skills/${slug}/SKILL.md`
          : platform === "VS Code"
            ? `cp ${slug}.skill.json .vscode/agent-skills/${slug}.json`
            : `${platform.toLowerCase().replaceAll(" ", "-")} skills install ${slug}`,
    configSnippet: JSON.stringify({ name, slug, entry: "SKILL.md", compatibility: platform }, null, 2),
    packageFormat: platform === "VS Code" ? ".vscode skill manifest" : "SKILL.md package",
    notes: `${platform} export includes instructions, examples, permissions, and version metadata.`,
  }));
}

function permissionReason(permission: PermissionKey) {
  const reasons: Record<PermissionKey, string> = {
    read_files: "Read uploaded sandbox files and skill package context.",
    write_files: "Create virtual artifacts during sandbox execution.",
    network: "Use allowlisted simulated network fetches.",
    shell: "Preview shell commands; real execution stays blocked in browser mode.",
    browser: "Inspect simulated browser/source context.",
    api_keys: "Access redacted provider metadata only.",
  };
  return reasons[permission];
}
