import { getSkill, latestVersion } from "./data";
import type { Skill, SkillRun, SkillTraceEvent } from "./types";

function stableId(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash).toString(36).padStart(6, "0").slice(0, 6);
}

function categoryOutput(skill: Skill, input: string) {
  const subject = input.trim() || "the supplied workspace";
  if (skill.category === "Observability") {
    return `Trace review complete for "${subject}". The run is healthy overall, with one blocked shell action, two model steps, and a cost spike isolated to the retrieval phase. Recommended next step: replay the failed branch with network disabled and compare latency against the previous passing trace.`;
  }
  if (skill.category === "Retrieval") {
    return `RAG audit complete for "${subject}". Citation coverage is strong, but chunk overlap is above target in two sections and one answer sentence is unsupported. Recommended next step: split the largest source chunk and add a citation assertion for the missing evidence path.`;
  }
  if (skill.category === "Code Review") {
    return `PR review complete for "${subject}". No critical issue was found, but the runner identified a medium-risk test gap around permission denial handling and a missing regression case for replayed traces. Recommended next step: add a blocked-command fixture and assert the trace export shape.`;
  }
  return `Research brief generated for "${subject}". The skill ranked primary sources first, marked two claims as uncertain, and exported a concise decision memo artifact. Recommended next step: verify the low-confidence source before publishing.`;
}

export function buildMockRun(skillSlug: string, input: string, deniedPermissions: string[] = []): SkillRun {
  const skill = getSkill(skillSlug) ?? getSkill("agent-observer");
  if (!skill) {
    throw new Error("No seeded skill is available.");
  }

  const version = latestVersion(skill);
  const id = `${skill.slug}-${stableId(`${skill.slug}:${input}:${deniedPermissions.join(",")}`)}`;
  const denied = new Set(deniedPermissions);
  const hasDenied = skill.permissions.some((permission) => denied.has(permission.key));
  const events: SkillTraceEvent[] = [
    ...skill.permissions.map((permission, index) => ({
      order: index + 1,
      type: "permission" as const,
      title: `${permission.key} permission`,
      detail: permission.reason,
      status: denied.has(permission.key) ? ("blocked" as const) : ("approved" as const),
      metadata: { risk: permission.risk },
    })),
    {
      order: skill.permissions.length + 1,
      type: "model",
      title: "Load skill context",
      detail: `${skill.name} ${version.version} instructions loaded with examples and compatibility tags.`,
      status: "complete",
      metadata: { tokens: 1840 },
    },
    {
      order: skill.permissions.length + 2,
      type: "tool",
      title: "read_file",
      detail: "Inspected the mocked SKILL.md package and run manifest.",
      status: "complete",
      metadata: { durationMs: 112 },
    },
    {
      order: skill.permissions.length + 3,
      type: "tool",
      title: "run_eval",
      detail: "Ran deterministic safety, formatting, and usefulness assertions.",
      status: hasDenied ? "failed" : "complete",
      metadata: { assertions: hasDenied ? 4 : 8 },
    },
    {
      order: skill.permissions.length + 4,
      type: "warning",
      title: "Dangerous action blocked",
      detail: "The sandbox blocked a destructive shell-like action during simulation.",
      status: "warning",
      metadata: { command: "rm -rf ./workspace" },
    },
    {
      order: skill.permissions.length + 5,
      type: "artifact",
      title: "generate_artifact",
      detail: "Created a portable run summary and install-ready manifest.",
      status: hasDenied ? "blocked" : "complete",
      metadata: { artifact: `${skill.slug}-run-summary.json` },
    },
  ];

  return {
    id,
    skillSlug: skill.slug,
    skillName: skill.name,
    version: version.version,
    input,
    status: hasDenied ? "failed" : "complete",
    output: hasDenied
      ? `Run blocked for "${input}". One or more required permissions were denied, so the mock sandbox stopped before artifact export. The trace still records approved steps, denied permissions, and the blocked action.`
      : categoryOutput(skill, input),
    latencyMs: 920 + skill.installCount % 700,
    estimatedCost: Number((0.012 + skill.rating / 1000).toFixed(4)),
    events,
    createdAt: new Date().toISOString(),
  };
}
