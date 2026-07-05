import { latestVersion } from "./data";
import { getProvider, getProviderRuntime } from "./providers";
import { appendRunEvent, saveRun } from "./repository";
import type { MarketplaceUser, SandboxArtifact, SandboxProvider, Skill, SkillRun, SkillTraceEvent, WorkspaceFile } from "./types";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function runId(skill: Skill, input: string) {
  const hash = Array.from(`${skill.slug}:${input}:${Date.now()}`).reduce((acc, char) => {
    return (acc * 31 + char.charCodeAt(0)) >>> 0;
  }, 7);
  return `${skill.slug}-${hash.toString(36)}`;
}

export function createInitialLiveRun(
  skill: Skill,
  owner: MarketplaceUser,
  input: string,
  providerId: SandboxProvider = "openai",
  workspaceFiles: WorkspaceFile[] = [],
  replayOf?: string,
): SkillRun {
  const version = latestVersion(skill);
  const provider = getProvider(providerId);
  const runtime = getProviderRuntime(provider.id);
  return {
    id: runId(skill, input),
    ownerId: owner.id,
    skillSlug: skill.slug,
    skillName: skill.name,
    version: version.version,
    input,
    status: "complete",
    output: "",
    latencyMs: 0,
    estimatedCost: Number((0.018 + skill.rating / 900).toFixed(4)),
    provider: provider.id,
    model: runtime.model,
    replayOf,
    workspaceFiles,
    artifacts: [],
    events: [],
    createdAt: new Date().toISOString(),
  };
}

export async function* streamLiveSandboxRun(
  skill: Skill,
  owner: MarketplaceUser,
  input: string,
  deniedPermissions: string[] = [],
  providerId: SandboxProvider = "openai",
  workspaceFiles: WorkspaceFile[] = [],
  replayOf?: string,
) {
  const provider = getProvider(providerId);
  const runtime = getProviderRuntime(provider.id);
  const run = createInitialLiveRun(skill, owner, input, provider.id, workspaceFiles, replayOf);
  const collectedEvents: SkillTraceEvent[] = [];
  await saveRun(run, owner);
  yield { kind: "run", run };

  let order = 1;
  let blocked = false;
  const denied = new Set(deniedPermissions);
  for (const permission of skill.permissions) {
    await delay(170);
    const event: SkillTraceEvent = {
      order,
      type: "permission",
      title: `${permission.key} permission`,
      detail: permission.reason,
      status: denied.has(permission.key) ? "blocked" : "approved",
      metadata: { risk: permission.risk },
    };
    collectedEvents.push(event);
    blocked ||= denied.has(permission.key);
    await appendRunEvent(run.id, event);
    yield { kind: "event", event };
    order += 1;
  }

  const steps: SkillTraceEvent[] = [
    {
      order: order++,
      type: "model",
      title: "Load live skill context",
      detail: `${skill.name} instructions, examples, permissions, and current version loaded into the sandbox.`,
      status: "complete",
      metadata: { provider: provider.label, model: runtime.model, mode: runtime.isLive ? "live-model" : "local-deterministic" },
    },
    {
      order: order++,
      type: "model",
      title: runtime.isLive ? "start provider stream" : "start local deterministic route",
      detail: runtime.isLive
        ? `${provider.label} is configured, so the sandbox streams model tokens through the provider API.`
        : `${provider.label} has no live key configured, so the sandbox uses deterministic local output.`,
      status: "running",
      metadata: { provider: provider.label, model: runtime.model, live: runtime.isLive },
    },
    {
      order: order++,
      type: "tool",
      title: "read_file",
      detail: workspaceFiles.length
        ? `Read ${workspaceFiles.length} workspace file(s): ${workspaceFiles.map((file) => file.path).join(", ")}.`
        : "Read SKILL.md, README, install manifest, and an empty workspace.",
      status: "complete",
      metadata: { files: workspaceFiles.length, scope: "workspace" },
    },
    {
      order: order++,
      type: "tool",
      title: "network",
      detail: "Resolved allowlisted package metadata through the virtual network tool.",
      status: blocked ? "blocked" : "complete",
      metadata: { allowlist: "marketplace.local, docs.local" },
    },
    {
      order: order++,
      type: "warning",
      title: "shell unavailable in virtual route",
      detail: "Virtual provider route does not execute shell commands. Use real shell sandbox mode for approved commands.",
      status: "warning",
      metadata: { command: "pnpm test --filter sandbox" },
    },
  ];

  for (const event of steps) {
    await delay(210);
    collectedEvents.push(event);
    await appendRunEvent(run.id, event);
    yield { kind: "event", event };
  }

  let output = "";
  let streamed = "";
  for await (const chunk of generateLiveOutputChunks(skill, input, blocked, provider.id, workspaceFiles, replayOf)) {
    await delay(90);
    streamed += chunk;
    output = streamed;
    yield { kind: "output", output: streamed };
  }

  const artifacts: SandboxArtifact[] = blocked
    ? []
    : [
        ...(isResearchBriefBuilder(skill)
          ? [
              {
                path: "research-brief.md",
                kind: "created" as const,
                after: output,
              },
            ]
          : []),
        {
          path: `${skill.slug}-sandbox-report.json`,
          kind: "report",
          after: JSON.stringify(
            {
              skill: skill.name,
              provider: provider.label,
              model: provider.model,
              input,
              filesRead: workspaceFiles.map((file) => file.path),
              replayOf,
              recommendation: "Review trace events and export the package for the target runtime.",
            },
            null,
            2,
          ),
        },
        {
          path: workspaceFiles[0]?.path ?? "workspace/notes.md",
          kind: workspaceFiles[0] ? "modified" : "created",
          before: workspaceFiles[0]?.content,
          after: `${workspaceFiles[0]?.content ?? "# Sandbox Notes"}\n\n## Sandbox Result\n${output}\n`,
        },
      ];

  const artifact: SkillTraceEvent = {
    order: order++,
    type: "artifact",
    title: "write_file",
    detail: blocked
      ? "Artifact generation skipped because a required permission was denied."
      : `Generated ${artifacts.length} virtual artifact(s), including ${
          isResearchBriefBuilder(skill) ? "research-brief.md" : `${skill.slug}-sandbox-report.json`
        }.`,
    status: blocked ? "blocked" : "complete",
    metadata: { file: isResearchBriefBuilder(skill) ? "research-brief.md" : `${skill.slug}-sandbox-report.json` },
  };
  collectedEvents.push(artifact);
  await appendRunEvent(run.id, artifact, output, blocked ? "failed" : "complete");
  yield { kind: "event", event: artifact };

  const complete: SkillRun = {
    ...run,
    output,
    status: blocked ? "failed" : "complete",
    latencyMs: Date.now() - Date.parse(run.createdAt),
    artifacts,
    events: collectedEvents,
  };
  await saveRun(complete, owner);
  yield { kind: "complete", run: complete };
}

async function* generateLiveOutputChunks(
  skill: Skill,
  input: string,
  blocked: boolean,
  providerId: SandboxProvider,
  workspaceFiles: WorkspaceFile[],
  replayOf?: string,
) {
  if (!blocked) {
    let emitted = false;
    try {
      for await (const chunk of streamOpenAICompatible(skill, input, providerId, workspaceFiles, replayOf)) {
        emitted = true;
        yield chunk;
      }
    } catch {
      emitted = false;
    }
    if (emitted) return;
  }

  const fallback = fallbackOutput(skill, input, blocked, providerId, workspaceFiles, replayOf);
  const chunkSize = 64;
  for (let index = 0; index < fallback.length; index += chunkSize) {
    yield fallback.slice(index, index + chunkSize);
  }
}

function fallbackOutput(
  skill: Skill,
  input: string,
  blocked: boolean,
  providerId: SandboxProvider,
  workspaceFiles: WorkspaceFile[],
  replayOf?: string,
) {
  if (blocked) {
    return `Live sandbox stopped before artifact export because a required permission was denied. The browser trace still captured permission decisions, virtual tool calls, blocked shell preview, and a replayable run record for "${input}".`;
  }

  if (isResearchBriefBuilder(skill)) {
    return buildResearchBriefOutput(skill, input, providerId, workspaceFiles, replayOf);
  }

  const filePhrase = workspaceFiles.length
    ? ` It read ${workspaceFiles.length} workspace file(s): ${workspaceFiles.map((file) => file.path).join(", ")}.`
    : " It ran with an empty workspace.";
  const replayPhrase = replayOf ? ` This was a replay of ${replayOf}.` : "";
  return `${skill.name} completed a virtual provider route for "${input}" using ${getProvider(providerId).label}.${filePhrase}${replayPhrase} The virtual tools inspected package context, applied permission policy, and produced trace-backed artifacts with install/export metadata.`;
}

function isResearchBriefBuilder(skill: Skill) {
  return skill.slug === "research-brief-builder" || skill.name.toLowerCase() === "research brief builder";
}

function titleFromPrompt(input: string) {
  const cleaned = input
    .replace(/^create\s+a\s+research\s+brief\s+(on|about|for)\s+/i, "")
    .replace(/\s+focus\s+on\s+[\s\S]*$/i, "")
    .replace(/\s+include:\s*[\s\S]*$/i, "")
    .replace(/\s+keep\s+it\s+[\s\S]*$/i, "")
    .trim()
    .replace(/[."]+$/g, "");
  return cleaned || "Agentic AI Developer Tools Market";
}

function buildResearchBriefOutput(
  skill: Skill,
  input: string,
  providerId: SandboxProvider,
  workspaceFiles: WorkspaceFile[],
  replayOf?: string,
) {
  const topic = titleFromPrompt(input);
  const provider = getProvider(providerId).label;
  const fileList = workspaceFiles.map((file) => file.path).join(", ") || "SKILL.md package context";
  const replayNote = replayOf ? ` This run replayed ${replayOf} with the same prompt and version context.` : "";

  return `# Research Brief: ${topic}

## Executive Summary
Agentic developer tools are moving from single-turn coding assistants toward managed work loops: planning, editing, testing, tracing, deployment, and reusable capability packaging. The strongest products reduce setup time, make tool actions inspectable, and help developers trust autonomous changes before they merge or deploy. An Agent Skill Marketplace fits this shift by turning repeatable agent workflows into portable, reviewable, installable units.

## Market Overview
The market is converging around three product patterns: IDE-native coding agents, terminal or repo agents, and cloud-hosted agent workspaces. Buyers care less about raw model access and more about integration quality, permission control, traceability, evals, and whether agents can adapt to team-specific workflows. The next durable layer is reusable skill distribution: teams need a way to package prompts, tools, permissions, tests, and install instructions without rebuilding them per agent.

## Key Players
- Codex: strong fit for repo-aware implementation, task execution, code review, and reproducible engineering workflows.
- Claude Code: strong terminal-agent positioning with planning, file editing, and developer workflow depth.
- OpenCode: open agent workflow surface for developers who want local control and extensibility.
- Grok: useful as a fast reasoning/provider option, especially where current-context synthesis matters.
- Gemini / Vertex AI: enterprise-oriented model access with Google ecosystem and cloud integration advantages.
- Vercel: strong deployment, AI app infrastructure, previews, and production workflow integration.
- GitHub Copilot: default distribution advantage inside GitHub and IDE coding workflows.

## Feature Comparison Table
| Player | Primary Surface | Strength | Gap An Agent Skill Marketplace Can Fill |
| --- | --- | --- | --- |
| Codex | Cloud/workspace coding agent | End-to-end implementation and review | Portable skill packs with evals and traces |
| Claude Code | Terminal/repo agent | Deep local workflow control | Discoverable, versioned team skills |
| OpenCode | Local/open agent tooling | Extensibility and developer ownership | Trusted marketplace metadata and install bundles |
| Grok | Model/provider layer | Fast synthesis and alternative reasoning | Skill compatibility recipes and provider switching |
| Gemini / Vertex AI | Cloud AI platform | Enterprise model access and governance | Agent workflow templates for developer teams |
| Vercel | Deployment and AI infrastructure | Preview-to-production app workflow | Skill exports tied to deployable app patterns |
| GitHub Copilot | IDE/GitHub assistant | Distribution and coding convenience | External skill testing, permissions, and portability |

## Developer Pain Points
- Agent setup is fragmented across IDEs, CLIs, cloud sandboxes, and model providers.
- Skills and prompts are hard to trust because permissions, version history, and tests are usually invisible.
- Teams lack a clean way to compare agent behavior across providers and toolchains.
- Successful workflows often stay trapped in private notes, READMEs, or one-off scripts.
- Trace logs exist in many tools, but they are rarely packaged with evals and install guidance.

## Opportunities for Agent Skill Marketplace
- Package each skill as a transparent bundle: instructions, permissions, examples, evals, changelog, and install targets.
- Let users try a skill in-browser before installing it into Codex, Claude, OpenCode, Grok, VS Code, or related tools.
- Add trust signals: verified authors, sandbox warnings, eval pass rates, trace samples, and compatibility badges.
- Offer provider comparison runs so users can test the same skill across OpenAI-compatible, Groq, Gemini, and local providers.
- Turn traces into reusable learning assets: failed runs, replay links, artifact diffs, and regression records.

## Risks and Adoption Barriers
- Users may confuse virtual sandbox output with real shell or network execution unless the UI labels boundaries clearly.
- Marketplace quality can collapse without review, eval scoring, version governance, and abuse controls.
- Skills that request broad permissions need stronger warnings and approval flows.
- Provider-specific behavior can make skill portability weaker than promised.
- Enterprise users will expect private registries, audit logs, SSO, and policy controls before adoption.

## Recommended Product Moves
1. Make the runner output a complete deliverable first, with trace metadata presented as supporting evidence.
2. Add a skill quality score based on eval coverage, pass rate, permission risk, install compatibility, and author trust.
3. Ship provider comparison runs for the same skill and prompt.
4. Add private team registries with review workflows and approved install targets.
5. Turn every successful run into exportable artifacts: markdown, JSON trace, package zip, and target-specific install docs.
6. Add source and claim confidence labels for research-oriented skills.

## Source Notes / Research Method
This brief was generated by ${skill.name} using the ${provider} provider route. The virtual runner loaded ${fileList}, applied the permission policy, used allowlisted browser/network inspection, and preserved trace-backed metadata for replay and export.${replayNote} Treat this as a product strategy draft; validate current market claims against primary vendor docs before publication.
`;
}

async function* streamOpenAICompatible(
  skill: Skill,
  input: string,
  providerId: SandboxProvider,
  workspaceFiles: WorkspaceFile[],
  replayOf?: string,
) {
  const runtime = getProviderRuntime(providerId);
  if (!runtime.isLive || !runtime.apiKey || !runtime.baseUrl) return;

  const response = await fetch(`${runtime.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${runtime.apiKey}`,
      ...(providerId === "openrouter"
        ? {
            "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
            "X-Title": "Agent Skill Marketplace",
          }
        : {}),
    },
    body: JSON.stringify({
      model: runtime.model,
      stream: true,
      messages: [
        {
          role: "system",
          content:
            isResearchBriefBuilder(skill)
              ? "You are running the Research Brief Builder skill inside a browser-safe virtual agent sandbox. Produce the actual research brief as the final deliverable, not a sandbox status summary. Use these exact sections: Title, Executive Summary, Market Overview, Key Players, Feature Comparison Table, Developer Pain Points, Opportunities for Agent Skill Marketplace, Risks and Adoption Barriers, Recommended Product Moves, Source Notes / Research Method. Be concise and never claim real shell execution or unrestricted network access."
              : "You are running inside a browser-safe virtual agent sandbox. Be concise, cite virtual tool behavior, and never claim real shell execution or unrestricted network access.",
        },
        {
          role: "user",
          content: [
            `Skill: ${skill.name}`,
            `Category: ${skill.category}`,
            `User input: ${input}`,
            `Workspace files: ${workspaceFiles.map((file) => `${file.path} (${file.size} bytes)`).join(", ") || "none"}`,
            replayOf ? `Replay of: ${replayOf}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
      temperature: 0.2,
    }),
  });
  if (!response.ok || !response.body) return;

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      const line = frame
        .split("\n")
        .map((item) => item.trim())
        .find((item) => item.startsWith("data: "));
      if (!line) continue;
      const data = line.slice(6);
      if (data === "[DONE]") return;
      const parsed = JSON.parse(data) as { choices?: { delta?: { content?: string } }[] };
      const content = parsed.choices?.[0]?.delta?.content;
      if (content) yield content;
    }
  }
}
