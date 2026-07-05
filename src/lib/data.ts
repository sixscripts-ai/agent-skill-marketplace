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

function detailedSkillMd({
  name,
  description,
  workflow,
  permissions,
  outputSections,
  examples,
}: {
  name: string;
  description: string;
  workflow: string[];
  permissions: { key: PermissionKey; reason: string }[];
  outputSections: string[];
  examples: string[];
}) {
  return `---
name: ${name.toLowerCase().replaceAll(" ", "-")}
description: ${description}
---

# ${name}

${description}

Use this skill when the user needs a controlled agent workflow with clear inputs, bounded actions, traceable decisions, and a final artifact that another agent or developer can use immediately.

## Workflow
${workflow.map((step, index) => `${index + 1}. ${step}`).join("\n")}

## Permissions
${permissions.map((permission) => `- ${permission.key}: ${permission.reason}`).join("\n")}

## Compatibility
${targets.map((target) => `- ${target}`).join("\n")}

## Output Format
${outputSections.map((section) => `- ${section}`).join("\n")}

## Examples
${examples.map((example) => `- "${example}"`).join("\n")}`;
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
  {
    id: "skill-format-doctor",
    slug: "skill-format-doctor",
    name: "Skill Format Doctor",
    summary:
      "Validates uploaded SKILL.md packages, detects missing sections, and proposes safe formatting fixes before publishing.",
    category: "SkillOps",
    trustLevel: "Verified",
    author: "SixScripts Labs",
    ownerId: "demo-user",
    visibility: "public",
    installCount: 1298,
    rating: 4.9,
    currentVersion: "v1.0.0",
    permissions: [
      { key: "read_files", reason: "Inspect SKILL.md, README, manifests, scripts, docs, and references.", risk: "low" },
      { key: "write_files", reason: "Create normalized SKILL.md drafts, repair notes, and package manifests.", risk: "medium" },
      { key: "shell", reason: "Optionally run safe validation scripts inside the approved sandbox.", risk: "high" },
    ],
    versions: [
      {
        version: "v1.0.0",
        skillMd: detailedSkillMd({
          name: "Skill Format Doctor",
          description:
            "Review, validate, and repair agent skill packages. Use this when a user uploads a .md, .skill, .zip, or folder and wants it to fit the marketplace skill format.",
          workflow: [
            "Inventory the package and identify the primary SKILL.md or .skill entry file.",
            "Parse frontmatter, title, description, workflow, permissions, examples, compatibility, and bundled resources.",
            "Classify issues as blocking errors, publishing warnings, or polish suggestions so the user can decide what to apply.",
            "Infer missing permissions and compatibility targets from the files and instructions, but explain every inferred permission.",
            "Generate a normalized SKILL.md patch and a manifest summary without changing the user intent.",
            "Return a publish readiness score, the suggested edits, and the exact next action.",
          ],
          permissions: [
            { key: "read_files", reason: "Read the uploaded skill package and supporting files." },
            { key: "write_files", reason: "Write repaired SKILL.md drafts, validation reports, and package manifests." },
            { key: "shell", reason: "Run approved local validation scripts only inside the sandbox." },
          ],
          outputSections: [
            "Readiness score",
            "Blocking issues",
            "Suggested SKILL.md patch",
            "Inferred permissions and compatibility",
            "Package manifest",
            "Publish checklist",
          ],
          examples: [
            "Validate this uploaded skill zip and tell me what blocks publishing.",
            "Fix this SKILL.md so it has proper permissions, workflow, compatibility, and examples.",
            "Review this folder upload and generate a normalized skill manifest.",
          ],
        }),
        readme:
          "Skill Format Doctor is the marketplace quality gate for uploaded agent skills. It finds malformed metadata, missing workflow sections, risky permissions, and package structure problems before publishing.",
        changelog: "Initial verified release with package inspection, suggested formatting fixes, and publish-readiness scoring.",
        compatibilityTargets: targets,
        createdAt: "2026-07-05",
      },
    ],
    evalSuites: [
      {
        name: "Format Repair",
        cases: [
          {
            input: "Validate a SKILL.md missing frontmatter and examples.",
            expected: "Reports blocking issues and returns a corrected SKILL.md draft.",
            assertionType: "format_compliance",
            status: "pass",
          },
          {
            input: "Inspect a zip with scripts, docs, assets, and no explicit permissions.",
            expected: "Infers read_files, write_files, and shell with clear reasons.",
            assertionType: "permission_inference",
            status: "pass",
          },
        ],
        results: [
          { version: "v1.0.0", score: 95, passed: 38, failed: 2, regressions: 0, createdAt: "2026-07-05" },
        ],
      },
    ],
    installTargets: installTargets("skill-format-doctor", "Skill Format Doctor"),
    reviews: [
      { rating: 5, user: "Devon S.", comment: "Turns rough skill uploads into publishable packages without hiding risk." },
    ],
  },
  {
    id: "skill-sandbox-script-runner",
    slug: "sandbox-script-runner",
    name: "Sandbox Script Runner",
    summary:
      "Runs uploaded package scripts in an isolated shell sandbox with approval gates, live output, and artifact collection.",
    category: "Sandbox",
    trustLevel: "Reviewed",
    author: "SixScripts Labs",
    ownerId: "demo-user",
    visibility: "public",
    installCount: 1044,
    rating: 4.8,
    currentVersion: "v1.0.0",
    permissions: [
      { key: "read_files", reason: "Mount uploaded package files and workspace inputs.", risk: "low" },
      { key: "write_files", reason: "Collect artifacts, reports, dist files, and changed workspace files.", risk: "medium" },
      { key: "shell", reason: "Execute the approved command inside an isolated sandbox.", risk: "high" },
      { key: "network", reason: "Allow outbound network only for approved hostnames.", risk: "medium" },
    ],
    versions: [
      {
        version: "v1.0.0",
        skillMd: detailedSkillMd({
          name: "Sandbox Script Runner",
          description:
            "Execute uploaded agent-skill scripts inside an isolated shell sandbox. Use this for package tests, build scripts, artifact generation, and command-output explanations.",
          workflow: [
            "Inspect the package manifest, scripts, and workspace files before suggesting commands.",
            "Present detected commands with risk labels and require explicit shell approval before execution.",
            "Normalize paths and network allowlists before mounting files or starting a command.",
            "Run exactly the approved command in the isolated sandbox with a timeout and output limit.",
            "Stream stdout, stderr, permission events, and command exit metadata into the trace.",
            "Collect artifacts from approved output paths and explain what changed.",
          ],
          permissions: [
            { key: "read_files", reason: "Read package files and workspace inputs." },
            { key: "write_files", reason: "Persist sandbox artifacts and changed files." },
            { key: "shell", reason: "Run the approved command in the isolated sandbox." },
            { key: "network", reason: "Use only approved public hostnames when network access is necessary." },
          ],
          outputSections: [
            "Command summary",
            "Permission decisions",
            "stdout and stderr highlights",
            "Exit status",
            "Artifacts generated",
            "Recommended next command",
          ],
          examples: [
            "Run npm test for this uploaded skill package and summarize failures.",
            "Execute scripts/build-report.mjs and collect artifacts/report.md.",
            "Run this package without network access and show the trace.",
          ],
        }),
        readme:
          "Sandbox Script Runner turns uploaded scripts into controlled, trace-backed runs. It is designed for real shell execution inside a sandbox, not the application server.",
        changelog: "Initial reviewed release with command approval, path normalization, network allowlists, and artifact collection.",
        compatibilityTargets: targets,
        createdAt: "2026-07-05",
      },
    ],
    evalSuites: [
      {
        name: "Sandbox Controls",
        cases: [
          {
            input: "Run a package script that writes artifacts/report.md.",
            expected: "Streams command output and returns the generated artifact.",
            assertionType: "artifact_collection",
            status: "pass",
          },
          {
            input: "Run a command with shell permission denied.",
            expected: "Blocks execution and records a denied shell event.",
            assertionType: "permission_enforcement",
            status: "pass",
          },
        ],
        results: [
          { version: "v1.0.0", score: 92, passed: 34, failed: 3, regressions: 0, createdAt: "2026-07-05" },
        ],
      },
    ],
    installTargets: installTargets("sandbox-script-runner", "Sandbox Script Runner"),
    reviews: [
      { rating: 5, user: "Iris P.", comment: "The live stdout trace makes uploaded script behavior easy to audit." },
    ],
  },
  {
    id: "skill-ai-app-builder",
    slug: "ai-app-builder",
    name: "AI App Builder Skill",
    summary:
      "Designs and scaffolds production-minded AI apps with provider routing, tool calls, persistence, evals, and deploy notes.",
    category: "App Builder",
    trustLevel: "Verified",
    author: "SixScripts Labs",
    ownerId: "demo-user",
    visibility: "public",
    installCount: 1517,
    rating: 4.8,
    currentVersion: "v1.0.0",
    permissions: [
      { key: "read_files", reason: "Inspect existing app structure, package config, and UI components.", risk: "low" },
      { key: "write_files", reason: "Generate routes, components, provider config, eval files, and docs.", risk: "medium" },
      { key: "shell", reason: "Run approved install, lint, build, and test commands.", risk: "high" },
      { key: "api_keys", reason: "Reference required env var names without exposing secret values.", risk: "high" },
    ],
    versions: [
      {
        version: "v1.0.0",
        skillMd: detailedSkillMd({
          name: "AI App Builder Skill",
          description:
            "Build or upgrade AI web apps with agent workflows, provider routing, tool-use boundaries, persistence, and deploy-ready structure.",
          workflow: [
            "Identify the target app type, user workflow, providers, tools, persistence needs, and deployment environment.",
            "Choose the smallest architecture that supports the required autonomy, traceability, and failure handling.",
            "Create or modify app routes, components, API handlers, provider adapters, and data models using the repo's existing patterns.",
            "Add guardrails for tool use, iteration limits, permission prompts, and visible failure states.",
            "Add eval prompts and smoke tests that prove the app can handle realistic agent tasks.",
            "Return a build summary with changed files, setup requirements, and deployment notes.",
          ],
          permissions: [
            { key: "read_files", reason: "Read the current application code and configuration." },
            { key: "write_files", reason: "Create or update app code, docs, tests, and eval fixtures." },
            { key: "shell", reason: "Run approved dependency, lint, build, and test commands." },
            { key: "api_keys", reason: "Name required provider env vars while keeping values redacted." },
          ],
          outputSections: [
            "Architecture decision",
            "Generated implementation plan",
            "Files changed",
            "Provider and env requirements",
            "Evaluation plan",
            "Deploy checklist",
          ],
          examples: [
            "Build a Next.js AI support agent with tools, traces, and saved conversations.",
            "Add provider switching and evals to this existing AI runner.",
            "Scaffold a deployable agent app with OpenAI-compatible routing and persistence.",
          ],
        }),
        readme:
          "AI App Builder Skill converts agent app ideas into implementation plans, components, routes, provider wiring, evals, and deployment notes.",
        changelog: "Initial verified release with agent architecture, tool guardrails, eval planning, and deployment checklist.",
        compatibilityTargets: targets,
        createdAt: "2026-07-05",
      },
    ],
    evalSuites: [
      {
        name: "App Build Quality",
        cases: [
          {
            input: "Add an AI runner with saved traces to a Next.js app.",
            expected: "Produces route, component, data, and eval plan with guardrails.",
            assertionType: "architecture_completeness",
            status: "pass",
          },
          {
            input: "Design provider switching with API key safety.",
            expected: "Separates public config from secrets and documents env vars.",
            assertionType: "secret_handling",
            status: "pass",
          },
        ],
        results: [
          { version: "v1.0.0", score: 94, passed: 36, failed: 2, regressions: 0, createdAt: "2026-07-05" },
        ],
      },
    ],
    installTargets: installTargets("ai-app-builder", "AI App Builder Skill"),
    reviews: [
      { rating: 5, user: "Kara T.", comment: "Strong architecture pass before it writes code. The guardrails are useful." },
    ],
  },
  {
    id: "skill-docs-polish-agent",
    slug: "docs-polish-agent",
    name: "Docs Polish Agent",
    summary:
      "Rewrites READMEs, install guides, examples, and marketplace copy so skills are clear, credible, and runnable.",
    category: "Documentation",
    trustLevel: "Reviewed",
    author: "SixScripts Labs",
    ownerId: "demo-user",
    visibility: "public",
    installCount: 933,
    rating: 4.7,
    currentVersion: "v1.0.0",
    permissions: [
      { key: "read_files", reason: "Read SKILL.md, README, examples, changelog, and source docs.", risk: "low" },
      { key: "write_files", reason: "Write improved documentation, examples, and install snippets.", risk: "medium" },
    ],
    versions: [
      {
        version: "v1.0.0",
        skillMd: detailedSkillMd({
          name: "Docs Polish Agent",
          description:
            "Improve agent-skill documentation so users understand what the skill does, when to use it, how to install it, and how to verify it works.",
          workflow: [
            "Read the skill package, existing docs, examples, install snippets, and any trace or eval evidence.",
            "Identify unclear promises, missing prerequisites, weak examples, and unsupported claims.",
            "Rewrite docs in a direct developer-tool voice with concrete commands and expected outputs.",
            "Preserve technical accuracy and avoid marketing claims that the package does not prove.",
            "Add quickstart, compatibility notes, permissions rationale, troubleshooting, and evaluation examples.",
            "Return the improved docs plus a short explanation of what changed and why.",
          ],
          permissions: [
            { key: "read_files", reason: "Read source documentation and skill package files." },
            { key: "write_files", reason: "Write polished README, install guides, examples, and changelog text." },
          ],
          outputSections: [
            "Improved README",
            "Install instructions",
            "Usage examples",
            "Permissions explanation",
            "Troubleshooting notes",
            "Change summary",
          ],
          examples: [
            "Polish this skill README so a developer can install and run it in five minutes.",
            "Rewrite the marketplace copy for this skill without hype.",
            "Create install docs for Codex, Claude, OpenCode, Grok, Antigravity, and VS Code.",
          ],
        }),
        readme:
          "Docs Polish Agent improves the trust surface of a skill package: README, examples, install docs, troubleshooting, and marketplace copy.",
        changelog: "Initial reviewed release with quickstart, compatibility, permission rationale, and troubleshooting output.",
        compatibilityTargets: targets,
        createdAt: "2026-07-05",
      },
    ],
    evalSuites: [
      {
        name: "Docs Clarity",
        cases: [
          {
            input: "Rewrite a vague skill README with missing install steps.",
            expected: "Adds quickstart, prerequisites, examples, and troubleshooting.",
            assertionType: "docs_completeness",
            status: "pass",
          },
          {
            input: "Polish marketplace copy for an experimental skill.",
            expected: "Improves clarity without overstating maturity or safety.",
            assertionType: "claim_control",
            status: "pass",
          },
        ],
        results: [
          { version: "v1.0.0", score: 91, passed: 32, failed: 3, regressions: 0, createdAt: "2026-07-05" },
        ],
      },
    ],
    installTargets: installTargets("docs-polish-agent", "Docs Polish Agent"),
    reviews: [
      { rating: 5, user: "Theo N.", comment: "Makes skill docs feel usable without turning them into sales pages." },
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
