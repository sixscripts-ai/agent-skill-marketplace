import { Sandbox, type NetworkPolicy } from "@vercel/sandbox";
import { findSkill } from "@/lib/repository";
import { sanitizeSandboxPath } from "@/lib/sandbox-security";
import { getSandboxReadiness } from "@/lib/sandbox-status";
import { terminalLimits, truncateOutput } from "@/lib/terminal-guardrails";
import type { MarketplaceUser, Skill, WorkspaceFile } from "@/lib/types";

export type TerminalSessionInfo = {
  sandboxName: string;
  skillSlug: string;
  ownerId: string;
  createdAt: string;
};

function credentials() {
  const token = process.env.VERCEL_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (token && teamId && projectId) {
    return { token, teamId, projectId };
  }
  return {};
}

export function assertTerminalSandboxReady() {
  const readiness = getSandboxReadiness();
  if (!readiness.realShellEnabled) {
    return {
      ok: false as const,
      status: 503,
      body: {
        error: true,
        code: "SANDBOX_DISABLED",
        message: "Real sandbox is disabled. Set ENABLE_REAL_SANDBOX=true.",
        suggestion: "Enable ENABLE_REAL_SANDBOX in Vercel project env and redeploy.",
      },
    };
  }
  if (readiness.sandboxAuthStatus === "missing") {
    return {
      ok: false as const,
      status: 503,
      body: {
        error: true,
        code: "SANDBOX_AUTH_MISSING",
        message: "Vercel Sandbox authentication is not configured.",
        suggestion: "Use Vercel OIDC in production, or set VERCEL_TOKEN, VERCEL_TEAM_ID, and VERCEL_PROJECT_ID locally.",
      },
    };
  }
  return { ok: true as const, readiness };
}

export async function createTerminalSandbox(options: {
  owner: MarketplaceUser;
  skillSlug: string;
  networkAllowlist?: string[];
  workspaceFiles?: WorkspaceFile[];
}) {
  const skill = await findSkill(options.skillSlug, options.owner);
  if (!skill) {
    throw Object.assign(new Error(`Skill not found: ${options.skillSlug}`), { code: "SKILL_NOT_FOUND", status: 404 });
  }

  const sandbox = await Sandbox.create({
    ...credentials(),
    runtime: "node24",
    timeout: terminalLimits.sessionTimeoutMs,
    resources: { vcpus: 1 },
    networkPolicy: buildNetworkPolicy(options.networkAllowlist ?? []),
    name: `term-${options.owner.id.slice(0, 8)}-${Date.now().toString(36)}`.slice(0, 63),
    tags: { app: "agent-skill-marketplace", surface: "terminal", skill: skill.slug },
    persistent: true,
  });

  const mountedFiles = await collectSandboxFiles(skill, options.workspaceFiles ?? []);
  if (mountedFiles.length) {
    await sandbox.writeFiles(mountedFiles);
  }

  const interactive = await sandbox.openInteractive();

  return {
    sandbox,
    skill,
    interactive,
    mountedFiles: mountedFiles.length,
    info: {
      sandboxName: sandbox.name,
      skillSlug: skill.slug,
      ownerId: options.owner.id,
      createdAt: new Date().toISOString(),
    } satisfies TerminalSessionInfo,
  };
}

export async function getTerminalSandbox(sandboxName: string) {
  return Sandbox.get({
    ...credentials(),
    name: sandboxName,
  });
}

export async function stopTerminalSandbox(sandboxName: string) {
  const sandbox = await getTerminalSandbox(sandboxName);
  await sandbox.stop();
}

export async function execInTerminalSandbox(options: {
  sandboxName: string;
  command: string;
  cwd?: string;
}) {
  const sandbox = await getTerminalSandbox(options.sandboxName);
  const running = await sandbox.runCommand({
    cmd: "bash",
    args: ["-lc", options.command],
    cwd: options.cwd?.trim() || "/vercel/sandbox",
    detached: true,
    timeoutMs: terminalLimits.commandTimeoutMs,
  });

  let stdout = "";
  let stderr = "";
  for await (const log of running.logs()) {
    if (log.stream === "stderr") stderr += log.data;
    else stdout += log.data;
  }
  const result = await running.wait();
  const output = truncateOutput(`${stdout}${stderr}`);
  return {
    exitCode: result.exitCode,
    stdout: truncateOutput(stdout),
    stderr: truncateOutput(stderr),
    output,
  };
}

export async function writeTerminalFile(options: {
  sandboxName: string;
  path: string;
  content: string;
}) {
  const safePath = sanitizeSandboxPath(options.path);
  if (Buffer.byteLength(options.content) > terminalLimits.maxFileBytes) {
    throw Object.assign(new Error("File exceeds size limit."), { code: "FILE_TOO_LARGE", status: 400 });
  }
  const sandbox = await getTerminalSandbox(options.sandboxName);
  await sandbox.writeFiles([{ path: safePath, content: options.content }]);
  return { path: safePath, bytes: Buffer.byteLength(options.content) };
}

export async function readTerminalFile(options: { sandboxName: string; path: string }) {
  const safePath = sanitizeSandboxPath(options.path);
  const sandbox = await getTerminalSandbox(options.sandboxName);
  const buffer = await sandbox.readFileToBuffer({ path: safePath, cwd: "/vercel/sandbox" });
  if (!buffer) {
    throw Object.assign(new Error(`File not found: ${safePath}`), { code: "FILE_NOT_FOUND", status: 404 });
  }
  if (buffer.byteLength > terminalLimits.maxFileBytes) {
    throw Object.assign(new Error("File exceeds size limit."), { code: "FILE_TOO_LARGE", status: 400 });
  }
  return { path: safePath, content: buffer.toString("utf8") };
}

async function collectSandboxFiles(skill: Skill, workspaceFiles: WorkspaceFile[]) {
  const packageFiles = skill.packages?.flatMap((pkg) => pkg.files) ?? [];
  const files = new Map<string, { path: string; content: string | Uint8Array; mode?: number }>();

  for (const file of packageFiles) {
    const path = sanitizeSandboxPath(file.path);
    const content = await packageFileContent(file.content, file.blobUrl);
    if (content === undefined) continue;
    files.set(path, { path, content, mode: executableMode(path) });
  }

  for (const file of workspaceFiles) {
    const path = sanitizeSandboxPath(file.path);
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

function executableMode(path: string) {
  return /\.(sh|js|mjs|ts|py)$/.test(path.toLowerCase()) ? 0o755 : undefined;
}

function buildNetworkPolicy(allowlist: string[]): NetworkPolicy {
  return allowlist.length ? { allow: allowlist } : "deny-all";
}
