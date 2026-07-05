import { Sandbox, type NetworkPolicy } from "@vercel/sandbox";
import { latestVersion } from "./data";
import { appendRunEvent, saveRun } from "./repository";
import type { SandboxArtifact, Skill, SkillRun, SkillTraceEvent, WorkspaceFile } from "./types";

const COMMAND_TIMEOUT_MS = 60_000;
const MAX_OUTPUT_BYTES = 200_000;
const MAX_ARTIFACT_BYTES = 200_000;
const MAX_ARTIFACTS = 20;

type RealShellOptions = {
  input: string;
  command?: string;
  deniedPermissions?: string[];
  workspaceFiles?: WorkspaceFile[];
  networkAllowlist?: string[];
  replayOf?: string;
};

type RealShellPayload =
  | { kind: "run"; run: SkillRun }
  | { kind: "event"; event: SkillTraceEvent }
  | { kind: "output"; output: string }
  | { kind: "complete"; run: SkillRun };

function runId(skill: Skill, input: string) {
  const hash = Array.from(`${skill.slug}:${input}:${Date.now()}`).reduce((acc, char) => {
    return (acc * 31 + char.charCodeAt(0)) >>> 0;
  }, 11);
  return `${skill.slug}-${hash.toString(36)}`;
}

function createRealShellRun(skill: Skill, options: RealShellOptions, command: string): SkillRun {
  const version = latestVersion(skill);
  return {
    id: runId(skill, options.input),
    skillSlug: skill.slug,
    skillName: skill.name,
    version: version.version,
    input: options.input,
    status: "running",
    output: "",
    latencyMs: 0,
    estimatedCost: 0,
    provider: "local",
    model: "vercel-sandbox/node24",
    replayOf: options.replayOf,
    workspaceFiles: options.workspaceFiles ?? [],
    artifacts: [],
    sandbox: {
      executionMode: "real-shell",
      command,
      networkPolicy: networkPolicyLabel(options.networkAllowlist ?? []),
    },
    events: [],
    createdAt: new Date().toISOString(),
  };
}

export async function* streamRealShellSandboxRun(skill: Skill, options: RealShellOptions): AsyncGenerator<RealShellPayload> {
  const command = options.command?.trim() ?? "";
  const run = createRealShellRun(skill, options, command);
  const collectedEvents: SkillTraceEvent[] = [];
  let order = 1;
  let output = "";

  const pushEvent = async (event: SkillTraceEvent, status?: SkillRun["status"]) => {
    collectedEvents.push(event);
    await appendRunEvent(run.id, event, output, status);
    return { kind: "event" as const, event };
  };

  await saveRun(run);
  yield { kind: "run", run };

  const denied = new Set(options.deniedPermissions ?? []);
  const runtimePermissions = skill.permissions.some((permission) => permission.key === "shell")
    ? skill.permissions
    : [
        ...skill.permissions,
        {
          key: "shell" as const,
          reason: "Execute the approved command inside an isolated Vercel Sandbox microVM.",
          risk: "high" as const,
        },
      ];
  for (const permission of runtimePermissions) {
    const event: SkillTraceEvent = {
      order: order++,
      type: "permission",
      title: `${permission.key} permission`,
      detail: permission.reason,
      status: denied.has(permission.key) ? "blocked" : "approved",
      metadata: { risk: permission.risk },
    };
    yield await pushEvent(event);
  }

  const shellDenied = denied.has("shell");
  if (shellDenied) {
    output = "Real shell execution was blocked because the shell permission was not approved for this run.";
    const event: SkillTraceEvent = {
      order: order++,
      type: "error",
      title: "shell blocked",
      detail: output,
      status: "blocked",
      metadata: { command: command || "none" },
    };
    yield await pushEvent(event, "failed");
    const complete = completeRun(run, output, "failed", collectedEvents, []);
    await saveRun(complete);
    yield { kind: "complete", run: complete };
    return;
  }

  if (!command) {
    output = "Real shell execution requires an explicit command or detected package script. No command was selected.";
    const event: SkillTraceEvent = {
      order: order++,
      type: "error",
      title: "command required",
      detail: output,
      status: "blocked",
    };
    yield await pushEvent(event, "failed");
    const complete = completeRun(run, output, "failed", collectedEvents, []);
    await saveRun(complete);
    yield { kind: "complete", run: complete };
    return;
  }

  if (process.env.ENABLE_REAL_SANDBOX !== "true") {
    output = "Real shell sandbox is disabled. Set ENABLE_REAL_SANDBOX=true and configure Vercel Sandbox authentication to run uploaded code.";
    const event: SkillTraceEvent = {
      order: order++,
      type: "error",
      title: "sandbox setup required",
      detail: output,
      status: "blocked",
      metadata: { requiredEnv: "ENABLE_REAL_SANDBOX" },
    };
    yield await pushEvent(event, "failed");
    const complete = completeRun(run, output, "failed", collectedEvents, []);
    await saveRun(complete);
    yield { kind: "complete", run: complete };
    return;
  }

  let sandbox: Awaited<ReturnType<typeof Sandbox.create>> | undefined;
  try {
    const networkPolicy = buildNetworkPolicy(denied.has("network") ? [] : options.networkAllowlist ?? []);
    sandbox = await Sandbox.create({
      runtime: "node24",
      timeout: COMMAND_TIMEOUT_MS + 30_000,
      resources: { vcpus: 1 },
      networkPolicy,
      name: `asm-${run.id}`.slice(0, 63),
      tags: { app: "agent-skill-marketplace", skill: skill.slug },
      persistent: false,
    });

    run.sandbox = {
      ...run.sandbox,
      sandboxName: sandbox.name,
      sandboxStatus: sandbox.status,
      networkPolicy: networkPolicyLabel(options.networkAllowlist ?? [], denied.has("network")),
    };

    yield await pushEvent({
      order: order++,
      type: "tool",
      title: "sandbox created",
      detail: `Created isolated Vercel Sandbox ${sandbox.name} with node24 runtime.`,
      status: "complete",
      metadata: { sandbox: sandbox.name, runtime: "node24" },
    });

    const mountedFiles = await collectSandboxFiles(skill, options.workspaceFiles ?? []);
    if (mountedFiles.length) {
      await sandbox.writeFiles(mountedFiles);
    }
    yield await pushEvent({
      order: order++,
      type: "tool",
      title: "files mounted",
      detail: `Mounted ${mountedFiles.length} uploaded package/workspace file(s) into /vercel/sandbox.`,
      status: "complete",
      metadata: { files: mountedFiles.length },
    });

    yield await pushEvent({
      order: order++,
      type: "tool",
      title: "command started",
      detail: `Executing approved command: ${command}`,
      status: "running",
      metadata: { command },
    });

    const running = await sandbox.runCommand({
      cmd: "bash",
      args: ["-lc", command],
      cwd: "/vercel/sandbox",
      detached: true,
      timeoutMs: COMMAND_TIMEOUT_MS,
    });

    let stdout = "";
    let stderr = "";
    for await (const log of running.logs()) {
      const chunk = truncateChunk(log.data, output);
      if (!chunk) continue;
      if (log.stream === "stderr") stderr += chunk;
      else stdout += chunk;
      output = appendLimited(output, chunk);
      yield { kind: "output", output };
    }

    const result = await running.wait();
    run.sandbox = {
      ...run.sandbox,
      exitCode: result.exitCode,
      stdoutBytes: Buffer.byteLength(stdout),
      stderrBytes: Buffer.byteLength(stderr),
    };

    yield await pushEvent({
      order: order++,
      type: result.exitCode === 0 ? "tool" : "error",
      title: "command exited",
      detail: `Command exited with code ${result.exitCode}.`,
      status: result.exitCode === 0 ? "complete" : "failed",
      metadata: { exitCode: result.exitCode, stdoutBytes: Buffer.byteLength(stdout), stderrBytes: Buffer.byteLength(stderr) },
    }, result.exitCode === 0 ? undefined : "failed");

    const artifacts = denied.has("write_files") ? [] : await collectArtifacts(sandbox);
    yield await pushEvent({
      order: order++,
      type: "artifact",
      title: "artifacts collected",
      detail: denied.has("write_files")
        ? "Artifact collection skipped because write_files permission was denied."
        : `Collected ${artifacts.length} artifact file(s) from artifacts/, reports/, and dist/.`,
      status: denied.has("write_files") ? "blocked" : "complete",
      metadata: { artifacts: artifacts.length },
    });

    const complete = completeRun(run, output || "Command completed without stdout or stderr.", result.exitCode === 0 ? "complete" : "failed", collectedEvents, artifacts);
    complete.sandbox = run.sandbox;
    await saveRun(complete);
    yield { kind: "complete", run: complete };
  } catch (error) {
    output = output || setupErrorMessage(error);
    const event: SkillTraceEvent = {
      order: order++,
      type: "error",
      title: "sandbox error",
      detail: setupErrorMessage(error),
      status: "failed",
    };
    yield await pushEvent(event, "failed");
    const complete = completeRun(run, output, "failed", collectedEvents, []);
    await saveRun(complete);
    yield { kind: "complete", run: complete };
  } finally {
    if (sandbox) {
      try {
        const stopped = await sandbox.stop();
        run.sandbox = {
          ...run.sandbox,
          sandboxStatus: stopped.status,
          cpuMs: stopped.activeCpuDurationMs,
          networkIngressBytes: stopped.networkTransfer?.ingress,
          networkEgressBytes: stopped.networkTransfer?.egress,
        };
      } catch {
        // Cleanup failures should not hide the run result.
      }
    }
  }
}

function completeRun(
  run: SkillRun,
  output: string,
  status: SkillRun["status"],
  events: SkillTraceEvent[],
  artifacts: SandboxArtifact[],
): SkillRun {
  const metadataArtifact: SandboxArtifact = {
    path: `${run.skillSlug}-sandbox-metadata.json`,
    kind: "report",
    after: JSON.stringify({ sandbox: run.sandbox, input: run.input, status }, null, 2),
  };
  return {
    ...run,
    output,
    status,
    latencyMs: Date.now() - Date.parse(run.createdAt),
    events,
    artifacts: [metadataArtifact, ...artifacts],
  };
}

async function collectSandboxFiles(skill: Skill, workspaceFiles: WorkspaceFile[]) {
  const packageFiles = skill.packages?.flatMap((pkg) => pkg.files) ?? [];
  const files = new Map<string, { path: string; content: string | Uint8Array; mode?: number }>();

  for (const file of packageFiles) {
    const path = safeSandboxPath(file.path);
    const content = await packageFileContent(file.content, file.blobUrl);
    if (content === undefined) continue;
    files.set(path, { path, content, mode: executableMode(path) });
  }

  for (const file of workspaceFiles) {
    const path = safeSandboxPath(file.path);
    files.set(path, { path, content: file.content, mode: executableMode(path) });
  }

  return [...files.values()];
}

async function packageFileContent(content?: string, blobUrl?: string) {
  if (content?.startsWith("data:")) {
    const [, encoded] = content.split(",", 2);
    return encoded ? Buffer.from(encoded, "base64") : undefined;
  }
  if (content !== undefined) return content;
  if (!blobUrl) return undefined;
  const response = await fetch(blobUrl);
  if (!response.ok) return undefined;
  return new Uint8Array(await response.arrayBuffer());
}

async function collectArtifacts(sandbox: Awaited<ReturnType<typeof Sandbox.create>>) {
  const result = await sandbox.runCommand({
    cmd: "bash",
    args: ["-lc", "find artifacts reports dist -type f 2>/dev/null | head -20"],
    cwd: "/vercel/sandbox",
    timeoutMs: 10_000,
  });
  const paths = (await result.stdout()).split("\n").map((line) => line.trim()).filter(Boolean).slice(0, MAX_ARTIFACTS);
  const artifacts: SandboxArtifact[] = [];
  for (const path of paths) {
    const safePath = safeSandboxPath(path);
    const buffer = await sandbox.readFileToBuffer({ path: safePath, cwd: "/vercel/sandbox" });
    if (!buffer || buffer.byteLength > MAX_ARTIFACT_BYTES) continue;
    artifacts.push({ path: safePath, kind: "created", after: buffer.toString("utf8") });
  }
  return artifacts;
}

function safeSandboxPath(input: string) {
  const normalized = input.replaceAll("\\", "/").replace(/^\/+/, "");
  const segments = normalized.split("/").filter(Boolean);
  if (
    !segments.length ||
    segments.some((segment) => segment === ".." || segment.includes("\0")) ||
    normalized.startsWith("../") ||
    normalized.includes("/../")
  ) {
    throw new Error(`Unsafe sandbox path rejected: ${input}`);
  }
  return segments.join("/");
}

function executableMode(path: string) {
  return /\.(sh|js|mjs|ts|py)$/.test(path.toLowerCase()) ? 0o755 : undefined;
}

function buildNetworkPolicy(allowlist: string[]): NetworkPolicy {
  const clean = allowlist.map((item) => item.trim()).filter(Boolean).slice(0, 20);
  return clean.length ? { allow: clean } : "deny-all";
}

function networkPolicyLabel(allowlist: string[], denied = false) {
  if (denied || allowlist.length === 0) return "deny-all";
  return `allow:${allowlist.join(",")}`;
}

function appendLimited(current: string, chunk: string) {
  const next = current + chunk;
  if (Buffer.byteLength(next) <= MAX_OUTPUT_BYTES) return next;
  return next.slice(0, MAX_OUTPUT_BYTES) + "\n\n[output truncated at 200 KB]";
}

function truncateChunk(chunk: string, current: string) {
  if (Buffer.byteLength(current) >= MAX_OUTPUT_BYTES) return "";
  return chunk;
}

function setupErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/token|credential|oidc|auth|unauthorized/i.test(message)) {
    return "Vercel Sandbox authentication is not configured. Set VERCEL_OIDC_TOKEN in production or VERCEL_TOKEN, VERCEL_TEAM_ID, and VERCEL_PROJECT_ID for local/external execution.";
  }
  return message || "Real shell sandbox failed before command execution.";
}
