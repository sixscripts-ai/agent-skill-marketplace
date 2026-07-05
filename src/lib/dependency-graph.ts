import type { Skill } from "./types";
import { sandboxProviders } from "./providers";

export type GraphNode = {
  id: string;
  label: string;
  type: "skill" | "permission" | "target" | "provider" | "suite" | "version" | "tool" | "file" | "artifact" | "eval-case";
  detail?: string;
  risk?: "low" | "medium" | "high";
};

export type GraphEdge = {
  from: string;
  to: string;
  label: string;
};

export function buildSkillGraph(skill: Skill) {
  const currentVersion = skill.versions[0];
  const tools = [
    { id: "tool:read_file", label: "read_file", permission: "read_files", detail: "Reads SKILL.md, README, and uploaded workspace files." },
    { id: "tool:write_file", label: "write_file", permission: "write_files", detail: "Writes artifacts into the downloadable workspace." },
    { id: "tool:network", label: "network", permission: "network", detail: "Uses allowlisted network access or provider metadata." },
    { id: "tool:shell", label: "shell", permission: "shell", detail: "Runs approved commands inside an isolated sandbox." },
    { id: "tool:browser", label: "browser", permission: "browser", detail: "Inspects browser/source context." },
    { id: "tool:api_keys", label: "api_keys", permission: "api_keys", detail: "Reads redacted provider/key metadata only." },
  ].filter((tool) => skill.permissions.some((permission) => permission.key === tool.permission));
  const evalCases = skill.evalSuites.flatMap((suite) =>
    suite.cases.map((testCase, index) => ({
      suite,
      testCase,
      index,
    })),
  );

  const nodes: GraphNode[] = [
    { id: skill.slug, label: skill.name, type: "skill", detail: skill.summary },
    ...skill.versions.map((version) => ({
      id: `version:${version.version}`,
      label: version.version,
      type: "version" as const,
      detail: version.changelog,
    })),
    ...skill.permissions.map((permission) => ({
      id: `permission:${permission.key}`,
      label: permission.key,
      type: "permission" as const,
      detail: permission.reason,
      risk: permission.risk,
    })),
    ...currentVersion.compatibilityTargets.map((target) => ({
      id: `target:${target}`,
      label: target,
      type: "target" as const,
      detail: "Install/export target",
    })),
    ...skill.evalSuites.map((suite) => ({
      id: `suite:${suite.name}`,
      label: suite.name,
      type: "suite" as const,
      detail: `${suite.cases.length} cases, ${suite.results.length} saved result runs`,
    })),
    ...evalCases.map(({ suite, testCase, index }) => ({
      id: `case:${suite.name}:${index}`,
      label: `${suite.name} #${index + 1}`,
      type: "eval-case" as const,
      detail: `${testCase.assertionType}: ${testCase.expected}`,
    })),
    ...sandboxProviders.map((provider) => ({
      id: `provider:${provider.id}`,
      label: provider.label,
      type: "provider" as const,
      detail: `${provider.model} (${provider.mode})`,
    })),
    ...tools.map((tool) => ({ id: tool.id, label: tool.label, type: "tool" as const, detail: tool.detail })),
    { id: "file:skill-md", label: "SKILL.md", type: "file", detail: "Primary portable skill instruction file." },
    { id: "file:readme", label: "README.md", type: "file", detail: "Marketplace and install documentation." },
    { id: "file:workspace", label: "Virtual workspace", type: "file", detail: "Browser-editable input files." },
    { id: "artifact:workspace-zip", label: "Workspace zip", type: "artifact", detail: "Downloadable run manifest, inputs, trace, and artifacts." },
    { id: "artifact:package-zip", label: "Install package zip", type: "artifact", detail: "SKILL.md package and platform install docs." },
  ];

  const edges: GraphEdge[] = [
    ...skill.versions.map((version) => ({
      from: skill.slug,
      to: `version:${version.version}`,
      label: version.version === skill.currentVersion ? "current" : "previous",
    })),
    ...skill.permissions.map((permission) => ({
      from: skill.slug,
      to: `permission:${permission.key}`,
      label: permission.risk,
    })),
    ...currentVersion.compatibilityTargets.map((target) => ({
      from: `version:${currentVersion.version}`,
      to: `target:${target}`,
      label: "exports",
    })),
    ...skill.evalSuites.map((suite) => ({
      from: skill.slug,
      to: `suite:${suite.name}`,
      label: `${suite.cases.length} cases`,
    })),
    ...evalCases.map(({ suite, index }) => ({
      from: `suite:${suite.name}`,
      to: `case:${suite.name}:${index}`,
      label: "asserts",
    })),
    ...sandboxProviders.map((provider) => ({
      from: skill.slug,
      to: `provider:${provider.id}`,
      label: provider.mode === "openai-compatible" ? "live when keyed" : "local deterministic",
    })),
    ...tools.map((tool) => ({
      from: `permission:${tool.permission}`,
      to: tool.id,
      label: "enables",
    })),
    { from: `version:${currentVersion.version}`, to: "file:skill-md", label: "contains" },
    { from: `version:${currentVersion.version}`, to: "file:readme", label: "documents" },
    { from: skill.slug, to: "file:workspace", label: "runs against" },
    { from: "file:workspace", to: "artifact:workspace-zip", label: "exports" },
    { from: `version:${currentVersion.version}`, to: "artifact:package-zip", label: "packages" },
  ];

  return { nodes, edges };
}
