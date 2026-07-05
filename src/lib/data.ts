import type { CompatibilityTarget, InstallTarget, PermissionKey, Skill } from "./types";

const targets: CompatibilityTarget[] = [
  "Codex",
  "Claude",
  "Antigravity",
  "OpenCode",
  "Grok",
  "VS Code",
];

function installTargets(slug: string, name: string): InstallTarget[] {
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
    configSnippet: JSON.stringify(
      {
        name,
        slug,
        entry: "SKILL.md",
        permissions: ["read_files", "network"],
        compatibility: platform,
      },
      null,
      2,
    ),
    packageFormat: platform === "VS Code" ? ".vscode skill manifest" : "SKILL.md package",
    notes: `${platform} export includes instructions, examples, permissions, and version metadata.`,
  }));
}

function skillMd(name: string, trigger: string, permissions: PermissionKey[]) {
  return `---
name: ${name.toLowerCase().replaceAll(" ", "-")}
description: ${trigger}
---

# ${name}

Use this skill when the user needs ${trigger.toLowerCase()}.

## Workflow
1. Confirm the user's goal and available context.
2. Inspect relevant files, docs, or input data.
3. Execute only approved actions.
4. Return a concise result with traceable evidence.

## Permissions
${permissions.map((permission) => `- ${permission}`).join("\n")}

## Examples
- "Run this skill against the current repo."
- "Generate a report with cited evidence."
- "Package this result for a downstream agent."`;
}

export const skills: Skill[] = [
  {
    id: "skill-observer",
    slug: "agent-observer",
    name: "Agent Observer",
    summary:
      "Traces agent runs, tool calls, costs, permission decisions, and failure points for debugging production workflows.",
    category: "Observability",
    trustLevel: "Verified",
    author: "SixScripts Labs",
    ownerId: "demo-user",
    visibility: "public",
    installCount: 1842,
    rating: 4.9,
    currentVersion: "v1.4.0",
    permissions: [
      { key: "read_files", reason: "Read trace exports and run manifests.", risk: "low" },
      { key: "network", reason: "Fetch remote trace bundles and provider metadata.", risk: "medium" },
      { key: "api_keys", reason: "Read redacted provider routing metadata.", risk: "high" },
    ],
    versions: [
      {
        version: "v1.4.0",
        skillMd: skillMd("Agent Observer", "agent observability and trace debugging", [
          "read_files",
          "network",
          "api_keys",
        ]),
        readme:
          "Agent Observer turns raw agent activity into readable timelines with cost, latency, tool-call, and failure annotations.",
        changelog: "Added cost deltas, replay-safe trace export, and blocked-command summaries.",
        compatibilityTargets: targets,
        createdAt: "2026-06-18",
      },
      {
        version: "v1.3.0",
        skillMd: skillMd("Agent Observer", "basic agent trace review", ["read_files", "network"]),
        readme: "Initial trace analyzer with model and tool-call timelines.",
        changelog: "Added provider routing labels and trace JSON export.",
        compatibilityTargets: ["Codex", "Claude", "OpenCode", "VS Code"],
        createdAt: "2026-05-29",
      },
    ],
    evalSuites: [
      {
        name: "Trace Accuracy",
        cases: [
          {
            input: "Identify blocked shell calls in a failed run.",
            expected: "Flags denied shell action and cites the trace event.",
            assertionType: "evidence_match",
            status: "pass",
          },
          {
            input: "Summarize provider latency regression.",
            expected: "Compares current and prior latency by provider.",
            assertionType: "numeric_threshold",
            status: "pass",
          },
        ],
        results: [
          { version: "v1.4.0", score: 96, passed: 24, failed: 1, regressions: 0, createdAt: "2026-06-18" },
          { version: "v1.3.0", score: 89, passed: 21, failed: 3, regressions: 1, createdAt: "2026-05-29" },
        ],
      },
    ],
    installTargets: installTargets("agent-observer", "Agent Observer"),
    reviews: [
      { rating: 5, user: "Maya R.", comment: "The trace viewer made agent failures explainable to non-ML engineers." },
    ],
  },
  {
    id: "skill-rag-auditor",
    slug: "rag-quality-auditor",
    name: "RAG Quality Auditor",
    summary:
      "Audits retrieval quality, chunk boundaries, citation coverage, hallucination risk, and answer faithfulness.",
    category: "Retrieval",
    trustLevel: "Reviewed",
    author: "Ashton Aschenbrener",
    ownerId: "demo-user",
    visibility: "public",
    installCount: 1260,
    rating: 4.8,
    currentVersion: "v0.9.2",
    permissions: [
      { key: "read_files", reason: "Inspect source documents, chunks, and eval fixtures.", risk: "low" },
      { key: "network", reason: "Optionally compare docs against live source URLs.", risk: "medium" },
    ],
    versions: [
      {
        version: "v0.9.2",
        skillMd: skillMd("RAG Quality Auditor", "retrieval quality and citation evaluation", [
          "read_files",
          "network",
        ]),
        readme:
          "Scores retriever output for citation coverage, missed evidence, chunk quality, and answer-grounding failures.",
        changelog: "Added missed-evidence clustering and citation coverage scoring.",
        compatibilityTargets: targets,
        createdAt: "2026-06-12",
      },
      {
        version: "v0.8.0",
        skillMd: skillMd("RAG Quality Auditor", "RAG eval review", ["read_files"]),
        readme: "Basic RAG evaluation skill for source-backed answers.",
        changelog: "Initial marketplace release.",
        compatibilityTargets: ["Codex", "Claude", "OpenCode"],
        createdAt: "2026-05-17",
      },
    ],
    evalSuites: [
      {
        name: "Citation Faithfulness",
        cases: [
          {
            input: "Audit this answer against retrieved chunks.",
            expected: "Finds unsupported claims and missing citations.",
            assertionType: "citation_coverage",
            status: "pass",
          },
          {
            input: "Score chunk overlap for a legal handbook.",
            expected: "Identifies overlong chunks and duplicate evidence.",
            assertionType: "chunk_quality",
            status: "pass",
          },
        ],
        results: [
          { version: "v0.9.2", score: 93, passed: 28, failed: 2, regressions: 0, createdAt: "2026-06-12" },
          { version: "v0.8.0", score: 86, passed: 22, failed: 5, regressions: 2, createdAt: "2026-05-17" },
        ],
      },
    ],
    installTargets: installTargets("rag-quality-auditor", "RAG Quality Auditor"),
    reviews: [
      { rating: 5, user: "Jordan K.", comment: "The chunk review caught bugs our normal prompt tests missed." },
    ],
  },
  {
    id: "skill-pr-sentinel",
    slug: "pr-sentinel",
    name: "PR Sentinel",
    summary:
      "Reviews pull requests for behavior risk, security issues, missing tests, and patch-ready remediation notes.",
    category: "Code Review",
    trustLevel: "Verified",
    author: "SixScripts Labs",
    ownerId: "demo-user",
    visibility: "public",
    installCount: 2211,
    rating: 4.7,
    currentVersion: "v2.1.1",
    permissions: [
      { key: "read_files", reason: "Read changed source, tests, and config.", risk: "low" },
      { key: "shell", reason: "Run safe test and static analysis commands.", risk: "high" },
      { key: "network", reason: "Fetch linked issue and PR metadata.", risk: "medium" },
    ],
    versions: [
      {
        version: "v2.1.1",
        skillMd: skillMd("PR Sentinel", "pull request risk review and patch guidance", [
          "read_files",
          "shell",
          "network",
        ]),
        readme:
          "PR Sentinel reviews diffs with a code-review stance and outputs severity-ranked findings with file references.",
        changelog: "Added shell approval previews and false-positive tracking.",
        compatibilityTargets: targets,
        createdAt: "2026-06-21",
      },
      {
        version: "v2.0.0",
        skillMd: skillMd("PR Sentinel", "pull request review", ["read_files", "shell"]),
        readme: "Diff review skill for code quality, test coverage, and security notes.",
        changelog: "Introduced structured review output.",
        compatibilityTargets: ["Codex", "Claude", "OpenCode", "VS Code"],
        createdAt: "2026-05-31",
      },
    ],
    evalSuites: [
      {
        name: "Review Precision",
        cases: [
          {
            input: "Review a diff with an auth bypass.",
            expected: "Reports high-severity auth risk with exact file location.",
            assertionType: "finding_precision",
            status: "pass",
          },
          {
            input: "Review harmless formatting-only diff.",
            expected: "Does not invent behavioral risk.",
            assertionType: "false_positive_rate",
            status: "pass",
          },
        ],
        results: [
          { version: "v2.1.1", score: 91, passed: 31, failed: 3, regressions: 0, createdAt: "2026-06-21" },
          { version: "v2.0.0", score: 87, passed: 27, failed: 5, regressions: 1, createdAt: "2026-05-31" },
        ],
      },
    ],
    installTargets: installTargets("pr-sentinel", "PR Sentinel"),
    reviews: [
      { rating: 4, user: "Elena V.", comment: "Strong PR summaries and useful test-gap detection." },
    ],
  },
  {
    id: "skill-brief-builder",
    slug: "research-brief-builder",
    name: "Research Brief Builder",
    summary:
      "Builds source-backed research briefs with credibility ranking, citation checks, and exportable decision memos.",
    category: "Research",
    trustLevel: "Experimental",
    author: "Ashton Aschenbrener",
    ownerId: "demo-user",
    visibility: "public",
    installCount: 714,
    rating: 4.5,
    currentVersion: "v0.4.0",
    permissions: [
      { key: "network", reason: "Search and fetch source material.", risk: "medium" },
      { key: "browser", reason: "Inspect web sources for citation context.", risk: "medium" },
      { key: "write_files", reason: "Export generated brief artifacts.", risk: "medium" },
    ],
    versions: [
      {
        version: "v0.4.0",
        skillMd: skillMd("Research Brief Builder", "source-backed research brief creation", [
          "network",
          "browser",
          "write_files",
        ]),
        readme:
          "Creates concise research briefs with source credibility labels, uncertainty callouts, and exportable memo artifacts.",
        changelog: "Added source ranking and artifact export.",
        compatibilityTargets: targets,
        createdAt: "2026-06-03",
      },
      {
        version: "v0.3.0",
        skillMd: skillMd("Research Brief Builder", "research summaries", ["network", "browser"]),
        readme: "Research summary skill with citations.",
        changelog: "Added browser source review.",
        compatibilityTargets: ["Claude", "Grok", "VS Code"],
        createdAt: "2026-05-11",
      },
    ],
    evalSuites: [
      {
        name: "Source Grounding",
        cases: [
          {
            input: "Write a market brief from conflicting sources.",
            expected: "Separates confirmed facts from uncertain claims.",
            assertionType: "uncertainty_labeling",
            status: "pass",
          },
          {
            input: "Rank sources by credibility.",
            expected: "Ranks official docs and primary sources first.",
            assertionType: "source_priority",
            status: "fail",
          },
        ],
        results: [
          { version: "v0.4.0", score: 84, passed: 19, failed: 4, regressions: 1, createdAt: "2026-06-03" },
          { version: "v0.3.0", score: 78, passed: 16, failed: 6, regressions: 2, createdAt: "2026-05-11" },
        ],
      },
    ],
    installTargets: installTargets("research-brief-builder", "Research Brief Builder"),
    reviews: [
      { rating: 4, user: "Nico D.", comment: "Good source discipline for an experimental research workflow." },
    ],
  },
];

export const categories = Array.from(new Set(skills.map((skill) => skill.category)));
export const compatibilityTargets = targets;
export const permissionKeys: PermissionKey[] = [
  "read_files",
  "write_files",
  "network",
  "shell",
  "browser",
  "api_keys",
];

export function getSkill(slug: string) {
  return skills.find((skill) => skill.slug === slug);
}

export function getSkillById(id: string) {
  return skills.find((skill) => skill.id === id || skill.slug === id);
}

export function latestVersion(skill: Skill) {
  return skill.versions.find((version) => version.version === skill.currentVersion) ?? skill.versions[0];
}
