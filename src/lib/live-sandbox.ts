import { latestVersion } from "./data";
import { getProvider, getProviderRuntime } from "./providers";
import { appendRunEvent, saveRun } from "./repository";
import type { SandboxArtifact, SandboxProvider, Skill, SkillRun, SkillTraceEvent, WorkspaceFile } from "./types";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function runId(skill: Skill, input: string) {
  const hash = Array.from(`${skill.slug}:${input}:${Date.now()}`).reduce((acc, char) => {
    return (acc * 31 + char.charCodeAt(0)) >>> 0;
  }, 7);
  return `${skill.slug}-${hash.toString(36)}`;
}

export function createInitialLiveRun(
  skill: Skill,
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
  input: string,
  deniedPermissions: string[] = [],
  providerId: SandboxProvider = "openai",
  workspaceFiles: WorkspaceFile[] = [],
  replayOf?: string,
) {
  const provider = getProvider(providerId);
  const runtime = getProviderRuntime(provider.id);
  const run = createInitialLiveRun(skill, input, provider.id, workspaceFiles, replayOf);
  const collectedEvents: SkillTraceEvent[] = [];
  await saveRun(run);
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
      metadata: { provider: provider.label, model: runtime.model, mode: runtime.isLive ? "live-model" : "simulated-model" },
    },
    {
      order: order++,
      type: "model",
      title: runtime.isLive ? "start provider stream" : "start deterministic model",
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
        ? `Read ${workspaceFiles.length} virtual workspace file(s): ${workspaceFiles.map((file) => file.path).join(", ")}.`
        : "Read SKILL.md, README, install manifest, and the empty virtual workspace.",
      status: "complete",
      metadata: { files: workspaceFiles.length, scope: "virtual workspace" },
    },
    {
      order: order++,
      type: "tool",
      title: "network",
      detail: "Resolved allowlisted package metadata through the simulated network tool.",
      status: blocked ? "blocked" : "complete",
      metadata: { allowlist: "marketplace.local, docs.local" },
    },
    {
      order: order++,
      type: "warning",
      title: "shell execution blocked",
      detail: "Browser sandbox mode previews shell commands but never executes them.",
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
      : `Generated ${artifacts.length} virtual artifact(s), including ${skill.slug}-sandbox-report.json.`,
    status: blocked ? "blocked" : "complete",
    metadata: { file: `${skill.slug}-sandbox-report.json` },
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
  await saveRun(complete);
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
  const chunks = fallback.match(/.{1,58}(\s|$)/g) ?? [fallback];
  for (const chunk of chunks) yield chunk;
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

  const filePhrase = workspaceFiles.length
    ? ` It read ${workspaceFiles.length} workspace file(s): ${workspaceFiles.map((file) => file.path).join(", ")}.`
    : " It ran with an empty workspace.";
  const replayPhrase = replayOf ? ` This was a replay of ${replayOf}.` : "";
  return `${skill.name} completed a live browser sandbox run for "${input}" using ${getProvider(providerId).label}.${filePhrase}${replayPhrase} The virtual tools inspected package context, applied permission policy, blocked shell execution by design, and produced trace-backed artifacts with install/export metadata.`;
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
            "You are running inside a browser-safe virtual agent sandbox. Be concise, cite virtual tool behavior, and never claim real shell execution or unrestricted network access.",
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
