"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Confirmation,
  ConfirmationAction,
  ConfirmationActions,
  ConfirmationRequest,
  ConfirmationTitle,
} from "@/components/ai-elements/confirmation";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { FileTree, FileTreeFile, FileTreeFolder } from "@/components/ai-elements/file-tree";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { Terminal } from "@/components/ai-elements/terminal";
import { Tool, ToolContent, ToolHeader, ToolInput, type ToolPart } from "@/components/ai-elements/tool";
import { ActionGuide, FeatureWalkthrough } from "@/components/feature-walkthrough";
import { SafeMessageResponse } from "@/components/safe-message-response";
import { sandboxProviders } from "@/lib/providers";
import { detectRunnableCommands } from "@/lib/run-state";
import type { AutopilotPlan } from "@/lib/autopilot";
import type { SandboxReadiness } from "@/lib/sandbox-status";
import type {
  ExecutionMode,
  PermissionKey,
  SandboxArtifact,
  SandboxProvider,
  Skill,
  SkillPackageFile,
  SkillPermission,
  SkillRun,
  SkillTraceEvent,
  WorkspaceFile,
} from "@/lib/types";
import { Badge, ButtonLink, Panel } from "./ui";
import { executeSkillRunStream } from "@/lib/runner";

const RUNTIME_SHELL_PERMISSION: SkillPermission = {
  key: "shell",
  reason: "Execute the approved command inside an isolated Vercel Sandbox microVM.",
  risk: "high",
};

type RunStreamPayload =
  | { kind: "run"; run: SkillRun }
  | { kind: "event"; event: SkillTraceEvent }
  | { kind: "output"; output: string }
  | { kind: "complete"; run: SkillRun };

type RunnerFileRecord = {
  path: string;
  content: string;
  source: "package" | "workspace" | "artifact";
  size: number;
  editable: boolean;
  role?: string;
};

type TreeNode = {
  name: string;
  path: string;
  children: Map<string, TreeNode>;
  file?: RunnerFileRecord;
};

export function RunnerClient({
  skill,
  initialRun,
  sandboxReadiness,
  initialMode,
}: {
  skill: Skill;
  initialRun: SkillRun;
  sandboxReadiness: SandboxReadiness;
  initialMode?: ExecutionMode;
}) {
  const initialWorkspace = initialRun.workspaceFiles ?? [];
  const initialCommands = detectRunnableCommands(skill, initialWorkspace);
  const initialSelectedPath =
    initialWorkspace[0]?.path ?? skill.packages?.[0]?.files[0]?.path ?? initialRun.artifacts?.[0]?.path ?? "";
  const [input, setInput] = useState(initialRun.input || "");
  const [denied, setDenied] = useState<string[]>([]);
  const [provider, setProvider] = useState<SandboxProvider>(initialRun.provider ?? "openai");
  const [executionMode, setExecutionMode] = useState<ExecutionMode>(initialMode ?? initialRun.sandbox?.executionMode ?? "autopilot");
  const [command, setCommand] = useState(initialRun.sandbox?.command ?? initialCommands[0] ?? "");
  const [networkAllowlist, setNetworkAllowlist] = useState("registry.npmjs.org,github.com");
  const [workspaceFiles, setWorkspaceFiles] = useState<WorkspaceFile[]>(initialWorkspace);
  const [selectedFilePath, setSelectedFilePath] = useState(initialSelectedPath);
  const [run, setRun] = useState<SkillRun>(initialRun);
  const [isRunning, setIsRunning] = useState(false);
  const [autopilotPlan, setAutopilotPlan] = useState<AutopilotPlan | null>(null);
  const [autoExecuted, setAutoExecuted] = useState(false);

  // Auto-execute when initialMode is autopilot
  useEffect(() => {
    if (initialMode === "autopilot" && !autoExecuted && !isRunning) {
      setAutoExecuted(true);
      void execute("", "autopilot");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMode]);

  const detectedCommands = useMemo(() => detectRunnableCommands(skill, workspaceFiles), [skill, workspaceFiles]);
  const permissions = useMemo(() => {
    if (executionMode !== "real-shell" || skill.permissions.some((permission) => permission.key === "shell")) {
      return skill.permissions;
    }
    return [...skill.permissions, RUNTIME_SHELL_PERMISSION];
  }, [executionMode, skill.permissions]);
  const allApproved = useMemo(
    () => permissions.every((permission) => !denied.includes(permission.key)),
    [denied, permissions],
  );
  const selectedProvider = sandboxProviders.find((item) => item.id === provider) ?? sandboxProviders[0];
  const fileRecords = useMemo(
    () => collectFileRecords(skill, workspaceFiles, run.artifacts ?? []),
    [skill, workspaceFiles, run.artifacts],
  );
  const selectedFile = fileRecords.find((file) => file.path === selectedFilePath) ?? fileRecords[0];
  const traceSummary = useMemo(() => buildTraceSummary(run, isRunning), [run, isRunning]);
  const terminalOutput = useMemo(() => buildTerminalOutput(run, command, executionMode), [run, command, executionMode]);
  const networkPolicy =
    denied.includes("network") || !networkAllowlist.trim()
      ? "deny-all"
      : `allow ${networkAllowlist
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
          .join(", ")}`;
  const suggestions = useMemo(() => skillSuggestions(skill), [skill]);
  const hasConversation = Boolean(run.input || input || run.output || run.events.length);

  function togglePermission(permission: PermissionKey) {
    setDenied((current) =>
      current.includes(permission) ? current.filter((item) => item !== permission) : [...current, permission],
    );
  }

  function addWorkspaceFile() {
    const now = new Date().toISOString();
    const nextPath = uniqueWorkspacePath(workspaceFiles);
    setWorkspaceFiles((current) => [
      ...current,
      {
        path: nextPath,
        content: "",
        size: 0,
        updatedAt: now,
      },
    ]);
    setSelectedFilePath(nextPath);
  }

  function updateWorkspaceFile(index: number, patch: Partial<WorkspaceFile>) {
    setWorkspaceFiles((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              ...patch,
              size: patch.content !== undefined ? patch.content.length : item.size,
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
    );
    if (patch.path) {
      setSelectedFilePath(patch.path);
    }
  }

  async function execute(nextInput = input, modeOverride?: ExecutionMode) {
    const activeMode = modeOverride ?? executionMode;
    const prompt = activeMode === "autopilot" ? (nextInput.trim() || "Run with autopilot.") : nextInput.trim();
    if (!prompt || isRunning) return;
    setInput(prompt);
    setIsRunning(true);
    setAutopilotPlan(null);
    if (modeOverride) setExecutionMode(modeOverride);
    
    await executeSkillRunStream({
      skillSlug: skill.slug,
      input: prompt,
      deniedPermissions: activeMode === "autopilot" ? [] : denied,
      provider,
      executionMode: activeMode,
      command,
      networkAllowlist: networkAllowlist
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      workspaceFiles,
      replayOf: initialRun.status === "pending" ? undefined : initialRun.id,
      onPlan: (plan) => {
        setAutopilotPlan(plan);
      },
      onRun: (payloadRun) => {
        setRun(payloadRun);
        setWorkspaceFiles(payloadRun.workspaceFiles ?? workspaceFiles);
      },
      onEvent: (event) => {
        setRun((current) => ({
          ...current,
          events: [...current.events.filter((e) => e.order !== event.order), event].sort(
            (a, b) => a.order - b.order,
          ),
        }));
      },
      onOutput: (output) => {
        setRun((current) => ({ ...current, output }));
      },
      onComplete: (payloadRun) => {
        setRun(payloadRun);
        setWorkspaceFiles(payloadRun.workspaceFiles ?? workspaceFiles);
      },
      onError: (message) => {
        setRun((current) => ({
          ...current,
          status: "failed",
          output: message,
        }));
      },
    });

    setIsRunning(false);
  }

  function handlePromptSubmit(message: PromptInputMessage) {
    void execute(message.text);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">Skill Chat Lab</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950">Run {skill.name}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
            Chat with the skill, approve permissions, inspect real files, watch tool calls, and review persisted run output.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={isRunning}
            onClick={() => void execute("", "autopilot")}
            data-testid="quick-run"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-neutral-950 px-5 font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
          >
            <span className="text-base">⚡</span> Quick Run
          </button>
          <Badge tone={allApproved ? "green" : "amber"}>{allApproved ? "permissions approved" : "permissions restricted"}</Badge>
          <Badge tone={run.status === "failed" ? "red" : run.status === "running" ? "amber" : "neutral"}>{run.status}</Badge>
        </div>
      </div>

      <ActionGuide
        steps={[
          { label: "1", title: "Add files", body: "Use Builder uploads or Add file when the skill needs real context." },
          { label: "2", title: "Pick a mode", body: "Use virtual agent for safe text output; use real shell only for approved commands." },
          { label: "3", title: "Run", body: "Start with a safe test prompt, then watch output and events stream in." },
          { label: "4", title: "Read output", body: "The center panel is the answer. Artifacts are saved reports or files." },
          { label: "5", title: "Open trace", body: "After a run, inspect the trace to see exactly what happened." },
        ]}
      />

      <div className="grid min-w-0 gap-6 2xl:grid-cols-[360px_minmax(0,1fr)_390px]">
        <div className="min-w-0 flex flex-col gap-6">
          <Panel className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-neutral-950">Prompt</h2>
                <p className="mt-1 text-sm text-neutral-600">Send a real run request to the persisted sandbox stream.</p>
              </div>
              <Badge tone={executionMode === "real-shell" ? "amber" : "blue"}>
                {executionMode === "real-shell" ? "real shell" : "virtual agent"}
              </Badge>
            </div>

            <div className="mt-4">
              <div className="mb-3 rounded-md border border-neutral-200 bg-neutral-50 p-3 text-sm leading-6 text-neutral-700">
                <span className="font-semibold text-neutral-950">Safe test prompt:</span> Inspect the workspace files and summarize risks,
                useful next steps, and any missing context.
              </div>
              <Suggestions>
                {suggestions.map((suggestion) => (
                  <Suggestion
                    key={suggestion}
                    className="border-neutral-300 bg-[#39FF14] text-neutral-900 hover:bg-neutral-100"
                    onClick={(value) => setInput(value)}
                    suggestion={suggestion}
                  />
                ))}
              </Suggestions>
            </div>

            <PromptInput className="mt-4" onSubmit={handlePromptSubmit}>
              <PromptInputBody>
                <PromptInputTextarea
                  className="min-h-32"
                  data-testid="run-prompt"
                  onChange={(event) => setInput(event.currentTarget.value)}
                  placeholder="Ask the skill to inspect files, run a command, or produce an artifact..."
                  value={input}
                />
              </PromptInputBody>
              <PromptInputFooter>
                <PromptInputTools>
                  <span className="font-mono text-xs text-neutral-500">{workspaceFiles.length} workspace files</span>
                </PromptInputTools>
                <PromptInputSubmit
                  className="btn-primary bg-neutral-950 text-white hover:bg-neutral-800"
                  data-testid="run-submit"
                  disabled={!input.trim() || isRunning}
                  status={isRunning ? "streaming" : "ready"}
                />
              </PromptInputFooter>
            </PromptInput>
          </Panel>

          <Panel className="p-5">
            <h2 className="font-semibold text-neutral-950">Execution controls</h2>
            <SandboxStatusPanel
              command={command}
              executionMode={executionMode}
              networkPolicy={networkPolicy}
              readiness={sandboxReadiness}
            />
            <div className="mt-4 grid gap-4">
              <label className="block text-sm font-medium text-neutral-700">
                Execution mode
                <select
                  value={executionMode}
                  onChange={(event) => setExecutionMode(event.target.value as ExecutionMode)}
                  data-testid="execution-mode"
                  className="mt-2 h-10 w-full rounded-md border px-3 text-sm outline-none"
                >
                  <option value="autopilot">⚡ Autopilot (recommended)</option>
                  <option value="virtual-agent">Virtual provider route</option>
                  <option value="real-shell">Real shell sandbox</option>
                </select>
              </label>

              {executionMode === "autopilot" ? (
                <div className="space-y-3">
                  <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">Autopilot Mode</div>
                    <p className="mt-2 text-sm leading-6 text-neutral-700">
                      Autopilot analyzes the skill&apos;s packages, detects the best command, auto-approves permissions, and executes immediately inside an isolated sandbox.
                    </p>
                    {autopilotPlan && (
                      <div className="mt-3 space-y-2 border-t border-neutral-200 pt-3">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-semibold text-neutral-950">Mode:</span>
                          <Badge tone={autopilotPlan.executionMode === "real-shell" ? "amber" : "blue"}>{autopilotPlan.executionMode}</Badge>
                        </div>
                        {autopilotPlan.command && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-semibold text-neutral-950">Command:</span>
                            <code className="rounded bg-neutral-100 px-2 py-0.5 font-mono text-xs">{autopilotPlan.command}</code>
                          </div>
                        )}
                        <p className="text-xs leading-5 text-neutral-600">{autopilotPlan.reasoning}</p>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={isRunning}
                    onClick={() => void execute("", "autopilot")}
                    data-testid="autopilot-run"
                    className="h-10 w-full rounded-md bg-neutral-950 font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
                  >
                    {isRunning ? "Running…" : "⚡ Run with Autopilot"}
                  </button>
                </div>
              ) : executionMode === "real-shell" ? (
                <>
                  <label className="block text-sm font-medium text-neutral-700">
                    Approved command
                    <input
                      value={command}
                      onChange={(event) => setCommand(event.target.value)}
                      data-testid="run-command"
                      placeholder="npm test"
                      className="mt-2 h-10 w-full rounded-md border px-3 font-mono text-sm outline-none"
                    />
                  </label>
                  {detectedCommands.length ? (
                    <div className="flex flex-wrap gap-2">
                      {detectedCommands.map((item) => (
                        <button
                          key={item}
                          onClick={() => setCommand(item)}
                          data-testid="detected-command"
                          className="rounded-md border border-neutral-300 bg-[#39FF14] px-3 py-2 font-mono text-xs text-neutral-900 transition hover:bg-neutral-100"
                          type="button"
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-md border border-dashed border-neutral-300 bg-neutral-50 p-3 text-sm leading-5 text-neutral-600">
                      No package script was detected. Enter the exact command to run inside the sandbox.
                    </div>
                  )}
                  <label className="block text-sm font-medium text-neutral-700">
                    Network allowlist
                    <input
                      value={networkAllowlist}
                      onChange={(event) => setNetworkAllowlist(event.target.value)}
                      data-testid="network-allowlist"
                      placeholder="registry.npmjs.org,github.com"
                      className="mt-2 h-10 w-full rounded-md border px-3 text-sm outline-none"
                    />
                  </label>
                </>
              ) : (
                <div className="grid gap-4">
                  <label className="block text-sm font-medium text-neutral-700">
                    Provider
                    <select
                      value={provider}
                      onChange={(event) => setProvider(event.target.value as SandboxProvider)}
                      data-testid="run-provider"
                      className="mt-2 h-10 w-full rounded-md border px-3 text-sm outline-none"
                    >
                      {sandboxProviders.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label} - {item.model}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                    <div className="text-xs uppercase tracking-[0.16em] text-neutral-500">Route</div>
                    <div className="mt-2 text-sm leading-5 text-neutral-700">
                      {selectedProvider.mode === "openai-compatible"
                        ? `Streams with ${selectedProvider.keyEnv} when configured; otherwise uses local deterministic provider output.`
                        : "Local deterministic provider route."}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Panel>

          <Panel className="p-5">
            <h2 className="font-semibold text-neutral-950">Approvals</h2>
            <div className="mt-4 flex flex-col gap-3">
              {permissions.map((permission) => {
                const isDenied = denied.includes(permission.key);
                return (
                  <Confirmation
                    key={permission.key}
                    approval={{ id: permission.key }}
                    className={isDenied ? "border-yellow-200 bg-yellow-50" : "border-neutral-200 bg-[#39FF14] text-black"}
                    state="approval-requested"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                      <ConfirmationTitle>
                        <span className="font-mono text-sm font-semibold text-neutral-950">{permission.key}</span>
                      </ConfirmationTitle>
                      <Badge tone={isDenied ? "amber" : "green"}>{isDenied ? "denied" : "approved"}</Badge>
                    </div>
                    <ConfirmationRequest>
                      <p className="text-sm leading-5 text-neutral-600">{permission.reason}</p>
                    </ConfirmationRequest>
                    <ConfirmationActions className="w-full flex-col items-stretch gap-2 self-stretch sm:w-auto sm:flex-row sm:items-center sm:self-end">
                      <ConfirmationAction
                        className="h-10 w-full border border-neutral-300 bg-[#39FF14] text-neutral-900 hover:bg-neutral-100 sm:w-auto"
                        data-testid={`permission-deny-${permission.key}`}
                        onClick={() => {
                          if (!isDenied) togglePermission(permission.key);
                        }}
                        variant="outline"
                      >
                        Deny
                      </ConfirmationAction>
                      <ConfirmationAction
                        className="btn-primary h-10 w-full bg-neutral-950 text-white hover:bg-neutral-800 sm:w-auto"
                        data-testid={`permission-approve-${permission.key}`}
                        onClick={() => {
                          if (isDenied) togglePermission(permission.key);
                        }}
                      >
                        Approve
                      </ConfirmationAction>
                    </ConfirmationActions>
                  </Confirmation>
                );
              })}
            </div>
          </Panel>
        </div>

        <Panel className="min-w-0 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 p-5">
            <div>
              <h2 className="font-semibold text-neutral-950">Conversation output</h2>
              <p className="mt-1 font-mono text-sm text-neutral-500">{run.id}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {run.status !== "pending" ? <ButtonLink href={`/traces/${run.id}`} testId="open-trace" variant="secondary">Open trace</ButtonLink> : null}
              {run.status !== "pending" ? <ButtonLink href={`/api/traces/${run.id}`} variant="secondary">JSON</ButtonLink> : null}
            </div>
          </div>
          <div className="grid gap-4 border-b border-neutral-200 p-5 sm:grid-cols-3">
            <RunMetric label="status" value={run.status} />
            <RunMetric label="latency" value={`${run.latencyMs}ms`} />
            <RunMetric label="mode" value={run.sandbox?.executionMode ?? executionMode} />
          </div>
          <div className="relative h-[640px]">
            <Conversation className="h-full">
              <ConversationContent className="gap-5 p-5">
                {!hasConversation ? (
                  <ConversationEmptyState
                    description="Choose a suggestion or enter a prompt to create a persisted run."
                    title="Start a skill run"
                  />
                ) : null}
                {run.input || input ? (
                  <Message from="user">
                    <MessageContent className="rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3 text-neutral-950">
                      <p className="whitespace-pre-wrap text-sm leading-6">{run.input || input}</p>
                    </MessageContent>
                  </Message>
                ) : null}
                {run.events.length || isRunning ? (
                  <Message from="assistant">
                    <MessageContent className="w-full">
                      <Reasoning className="w-full" defaultOpen={isRunning} isStreaming={isRunning}>
                        <ReasoningTrigger
                          getThinkingMessage={(streaming) => (
                            <p>{streaming ? "Streaming run trace..." : "Run trace summary"}</p>
                          )}
                        />
                        <ReasoningContent>{traceSummary}</ReasoningContent>
                      </Reasoning>
                    </MessageContent>
                  </Message>
                ) : null}
                {run.output ? (
                  <Message from="assistant" className="max-w-full">
                    <MessageContent className="w-full rounded-md border border-neutral-200 bg-[#39FF14] p-4">
                      <SafeMessageResponse>{run.output}</SafeMessageResponse>
                    </MessageContent>
                  </Message>
                ) : isRunning ? (
                  <Message from="assistant">
                    <MessageContent className="rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
                      Streaming output...
                    </MessageContent>
                  </Message>
                ) : null}
              </ConversationContent>
              <ConversationScrollButton />
            </Conversation>
          </div>
        </Panel>

        <div className="min-w-0 flex flex-col gap-6">
          <Panel className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-neutral-950">Files</h2>
                <p className="mt-1 text-sm text-neutral-600">Uploaded packages, workspace files, and generated artifacts.</p>
              </div>
              <button
                onClick={addWorkspaceFile}
                data-testid="add-workspace-file"
                className="rounded-md border border-neutral-300 bg-[#39FF14] px-3 py-2 text-xs font-semibold text-neutral-900 transition hover:bg-neutral-100"
                type="button"
              >
                Add file
              </button>
            </div>
            <div className="mt-4">
              {fileRecords.length ? (
                <FileTree
                  className="border-neutral-200 bg-neutral-50"
                  defaultExpanded={defaultExpandedPaths(fileRecords)}
                  onSelect={setSelectedFilePath}
                  selectedPath={selectedFile?.path}
                >
                  {renderFileTree(fileRecords)}
                </FileTree>
              ) : (
                <div className="rounded-md border border-dashed border-neutral-300 bg-neutral-50 p-4 text-sm leading-6 text-neutral-600">
                  No files are attached. Upload a package in Builder or add a file here.
                </div>
              )}
            </div>
            {selectedFile ? (
              <div className="mt-4 rounded-md border border-neutral-200 bg-[#39FF14] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-mono text-xs font-semibold text-neutral-950">{selectedFile.path}</div>
                    <div className="mt-1 text-xs text-neutral-500">
                      {selectedFile.source} {selectedFile.role ? `/${selectedFile.role}` : ""} · {selectedFile.size} bytes
                    </div>
                  </div>
                  <Badge tone={selectedFile.editable ? "blue" : "neutral"}>{selectedFile.editable ? "editable" : "read only"}</Badge>
                </div>
                {selectedFile.editable ? (
                  <WorkspaceFileEditor
                    file={selectedFile}
                    onChange={(path, content) => {
                      const index = workspaceFiles.findIndex((item) => item.path === selectedFile.path);
                      if (index >= 0) updateWorkspaceFile(index, { path, content });
                    }}
                  />
                ) : (
                  <div className="mt-3 max-h-56 overflow-auto rounded-md border border-neutral-200 bg-neutral-50 p-3">
                    <SafeMessageResponse>{selectedFile.content || "No preview content available."}</SafeMessageResponse>
                  </div>
                )}
              </div>
            ) : null}
          </Panel>

          <Panel className="p-5">
            <h2 className="font-semibold text-neutral-950">Tool timeline</h2>
            <div className="mt-4 max-h-[520px] overflow-auto pr-1">
              {run.events.length ? (
                run.events.map((event) => <TraceTool key={`${event.order}-${event.title}`} event={event} />)
              ) : (
                <div className="rounded-md border border-dashed border-neutral-300 bg-neutral-50 p-4 text-sm leading-6 text-neutral-600">
                  No trace events yet. Start a run to stream permission checks and tool calls.
                </div>
              )}
            </div>
          </Panel>
        </div>
      </div>

      <FeatureWalkthrough
        title="Sandbox runs a skill and shows the evidence."
        description="Use this page when you want to test whether a skill can handle a real prompt, inspect its files, request permissions, and produce a useful result. The sandbox is the place where a skill proves it can do work."
        example="Ask: Audit the uploaded package, run the approved command, and produce a short report with risks and next steps."
        why="A skill is only valuable if it can turn context into output while showing what it touched, what it blocked, and what it saved."
        items={[
          {
            title: "Prompt",
            body: "Tell the skill what job to do. Use the suggestions when you are not sure what a good request looks like.",
          },
          {
            title: "Execution controls",
            body: "Choose virtual agent for text/tool flow or real shell when you want an approved command to run inside Vercel Sandbox.",
          },
          {
            title: "Approvals",
            body: "These are safety gates. Denying shell, network, or file writes should change what the run is allowed to do.",
          },
          {
            title: "Evidence panes",
            body: "Conversation output is the answer. Files, terminal, artifacts, and tool timeline explain how that answer was produced.",
          },
        ]}
      />

      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 p-5">
          <div>
            <h2 className="font-semibold text-neutral-950">Real shell terminal</h2>
            <p className="mt-1 text-sm text-neutral-600">
              Shows command output for Vercel Sandbox shell runs. Virtual provider output stays in the conversation pane.
            </p>
          </div>
          {run.status !== "pending" ? <ButtonLink href={`/api/workspaces/${run.id}`} variant="secondary">Workspace zip</ButtonLink> : null}
        </div>
        <Terminal autoScroll className="m-5" isStreaming={isRunning && executionMode === "real-shell"} output={terminalOutput} />
      </Panel>

      {run.artifacts?.length ? (
        <Panel className="p-5">
          <h2 className="font-semibold text-neutral-950">Artifacts</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {run.artifacts.map((artifact) => (
              <div key={artifact.path} className="rounded-md border border-neutral-200 bg-neutral-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-sm text-neutral-950">{artifact.path}</span>
                  <Badge tone={artifact.kind === "created" ? "green" : "blue"}>{artifact.kind}</Badge>
                </div>
                <div className="mt-3 max-h-72 overflow-auto rounded-md border border-neutral-200 bg-[#39FF14] p-3">
                  <SafeMessageResponse>{artifact.after}</SafeMessageResponse>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}

function SandboxStatusPanel({
  command,
  executionMode,
  networkPolicy,
  readiness,
}: {
  command: string;
  executionMode: ExecutionMode;
  networkPolicy: string;
  readiness: SandboxReadiness;
}) {
  const shellReady =
    executionMode !== "real-shell" ||
    (readiness.realShellEnabled && readiness.sandboxAuthStatus !== "missing" && readiness.projectLinked);
  return (
    <div className="mt-4 rounded-md border border-neutral-200 bg-neutral-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">Sandbox readiness</div>
          <div className="mt-1 text-sm text-neutral-700">
            {shellReady ? "Execution route is configured for the selected mode." : "Real shell requires env enablement and Vercel Sandbox auth."}
          </div>
        </div>
        <Badge tone={shellReady ? "green" : "amber"}>{shellReady ? "ready" : "setup needed"}</Badge>
      </div>
      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
        <StatusRow label="real shell" tone={readiness.realShellEnabled ? "green" : "neutral"} value={readiness.realShellEnabled ? "enabled" : "disabled"} />
        <StatusRow label="sandbox auth" tone={readiness.sandboxAuthStatus === "missing" ? "amber" : "green"} value={readiness.sandboxAuthStatus} />
        <StatusRow label="project link" tone={readiness.projectLinked ? "green" : "amber"} value={readiness.projectLinked ? "linked" : "missing"} />
        <StatusRow label="command" tone={command.trim() ? "green" : "amber"} value={command.trim() ? "selected" : "required"} />
        <StatusRow label="network" tone={networkPolicy === "deny-all" ? "neutral" : "blue"} value={networkPolicy} />
        <StatusRow label="default policy" tone="neutral" value={readiness.networkDefault} />
      </div>
    </div>
  );
}

function StatusRow({
  label,
  tone,
  value,
}: {
  label: string;
  tone: "green" | "amber" | "blue" | "neutral";
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded border border-neutral-200 bg-[#39FF14] px-3 py-2">
      <span className="shrink-0 text-neutral-500">{label}</span>
      <span className="min-w-0 truncate">
        <Badge tone={tone}>{value}</Badge>
      </span>
    </div>
  );
}

function WorkspaceFileEditor({
  file,
  onChange,
}: {
  file: RunnerFileRecord;
  onChange: (path: string, content: string) => void;
}) {
  return (
    <div className="mt-3">
      <input
        value={file.path}
        onChange={(event) => onChange(event.target.value, file.content)}
        className="h-9 w-full rounded-md border px-3 font-mono text-xs outline-none"
      />
      <textarea
        value={file.content}
        onChange={(event) => onChange(file.path, event.target.value)}
        className="mt-2 min-h-36 w-full rounded-md border p-3 font-mono text-xs leading-5 outline-none"
        placeholder="Add real context for this run..."
      />
    </div>
  );
}

function TraceTool({ event }: { event: SkillTraceEvent }) {
  const state = eventToolState(event);
  return (
    <Tool className="mb-3 border-neutral-200 bg-[#39FF14] text-black" defaultOpen={event.status !== "complete" && event.status !== "approved"}>
      <ToolHeader state={state} title={`${String(event.order).padStart(2, "0")} ${event.title}`} type={eventToolType(event)} />
      <ToolContent>
        <ToolInput
          input={{
            order: event.order,
            type: event.type,
            status: event.status,
            metadata: event.metadata ?? {},
          }}
        />
        <div className="rounded-md bg-neutral-50 p-3 text-sm leading-6 text-neutral-700">
          <SafeMessageResponse>{event.detail}</SafeMessageResponse>
        </div>
      </ToolContent>
    </Tool>
  );
}

function RunMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-lg font-semibold text-neutral-950">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.16em] text-neutral-500">{label}</div>
    </div>
  );
}

function collectFileRecords(skill: Skill, workspaceFiles: WorkspaceFile[], artifacts: SandboxArtifact[]) {
  const records = new Map<string, RunnerFileRecord>();
  for (const file of skill.packages?.flatMap((pkg) => pkg.files) ?? []) {
    records.set(file.path, packageFileRecord(file));
  }
  for (const file of workspaceFiles) {
    records.set(file.path, {
      path: file.path,
      content: file.content,
      source: "workspace",
      size: file.size,
      editable: true,
    });
  }
  for (const artifact of artifacts) {
    records.set(artifact.path, {
      path: artifact.path,
      content: artifact.after,
      source: "artifact",
      size: artifact.after.length,
      editable: false,
      role: artifact.kind,
    });
  }
  return [...records.values()].sort((a, b) => a.path.localeCompare(b.path));
}

function packageFileRecord(file: SkillPackageFile): RunnerFileRecord {
  const textContent = typeof file.content === "string" && !file.content.startsWith("data:") ? file.content : "";
  return {
    path: file.path,
    content: textContent || `Uploaded ${file.role} file stored in the package manifest.${file.blobUrl ? `\n\nBlob: ${file.blobUrl}` : ""}`,
    source: "package",
    size: file.size,
    editable: false,
    role: file.role,
  };
}

function renderFileTree(records: RunnerFileRecord[]) {
  const root = buildTree(records);
  return renderTreeNodes([...root.children.values()]);
}

function renderTreeNodes(nodes: TreeNode[]): ReactNode {
  return sortTreeNodes(nodes).map((node) => {
    if (node.file) {
      return <FileTreeFile key={node.path} name={node.name} path={node.path} />;
    }
    return (
      <FileTreeFolder key={node.path} name={node.name} path={node.path}>
        {renderTreeNodes([...node.children.values()])}
      </FileTreeFolder>
    );
  });
}

function buildTree(records: RunnerFileRecord[]) {
  const root: TreeNode = { name: "", path: "", children: new Map() };
  for (const record of records) {
    const segments = record.path.split("/").filter(Boolean);
    let current = root;
    let currentPath = "";
    segments.forEach((segment, index) => {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      const isFile = index === segments.length - 1;
      const existing = current.children.get(segment);
      const next: TreeNode = existing ?? { name: segment, path: currentPath, children: new Map<string, TreeNode>() };
      if (isFile) next.file = record;
      current.children.set(segment, next);
      current = next;
    });
  }
  return root;
}

function sortTreeNodes(nodes: TreeNode[]) {
  return nodes.sort((a, b) => {
    if (Boolean(a.file) !== Boolean(b.file)) return a.file ? 1 : -1;
    return a.name.localeCompare(b.name);
  });
}

function defaultExpandedPaths(records: RunnerFileRecord[]) {
  const paths = new Set<string>();
  for (const file of records) {
    const segments = file.path.split("/").filter(Boolean);
    let current = "";
    for (const segment of segments.slice(0, -1)) {
      current = current ? `${current}/${segment}` : segment;
      paths.add(current);
    }
  }
  return paths;
}

function eventToolState(event: SkillTraceEvent): ToolPart["state"] {
  if (event.status === "blocked") return "output-denied";
  if (event.status === "failed") return "output-error";
  if (event.status === "running") return "input-available";
  return "output-available";
}

function eventToolType(event: SkillTraceEvent) {
  return `tool-${sanitizeToolName(event.title)}` as `tool-${string}`;
}

function sanitizeToolName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "event";
}

function buildTraceSummary(run: SkillRun, isRunning: boolean) {
  const approved = run.events.filter((event) => event.type === "permission" && event.status === "approved").length;
  const blocked = run.events.filter((event) => event.status === "blocked").length;
  const tools = run.events.filter((event) => event.type === "tool" || event.type === "artifact").length;
  const warnings = run.events.filter((event) => event.status === "warning" || event.type === "warning").length;
  return [
    `**Status:** ${run.status}${isRunning ? " (streaming)" : ""}`,
    `**Permissions approved:** ${approved}`,
    `**Blocked events:** ${blocked}`,
    `**Tool/artifact events:** ${tools}`,
    `**Warnings:** ${warnings}`,
    run.sandbox?.command ? `**Command:** \`${run.sandbox.command}\`` : "",
    run.sandbox?.networkPolicy ? `**Network policy:** ${run.sandbox.networkPolicy}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function buildTerminalOutput(run: SkillRun, currentCommand: string, executionMode: ExecutionMode) {
  const command = run.sandbox?.command ?? currentCommand;
  const isRealShell = run.sandbox?.executionMode === "real-shell" || executionMode === "real-shell";
  if (!isRealShell) return "Virtual provider route selected. Real shell output will appear here when you switch to real shell sandbox mode.";

  const lines = [];
  if (command) lines.push(`$ ${command}`);
  for (const event of run.events) {
    if (["sandbox created", "files mounted", "command started", "command exited", "sandbox setup required", "sandbox error", "shell blocked"].includes(event.title)) {
      lines.push(`[${event.status}] ${event.detail}`);
    }
  }
  if (run.output) lines.push("", run.output);
  return lines.join("\n") || "No shell output captured yet.";
}

function skillSuggestions(skill: Skill) {
  const lowerCategory = skill.category.toLowerCase();
  if (lowerCategory.includes("research")) {
    return [
      "Create a concise market brief from the uploaded package context.",
      "Compare the key tools and list adoption risks.",
      "Produce a source-noted strategy memo with next product moves.",
    ];
  }
  if (lowerCategory.includes("security")) {
    return [
      "Audit the uploaded skill package for permission and execution risks.",
      "Find unsafe commands, paths, and network assumptions.",
      "Create a remediation checklist with severity labels.",
    ];
  }
  return [
    `Run ${skill.name} against the uploaded package and produce artifacts.`,
    "Inspect the workspace files and summarize required changes.",
    "Generate a trace-backed report with risks and next steps.",
  ];
}

function uniqueWorkspacePath(files: WorkspaceFile[]) {
  let index = files.length + 1;
  let path = `workspace/file-${index}.md`;
  const existing = new Set(files.map((file) => file.path));
  while (existing.has(path)) {
    index += 1;
    path = `workspace/file-${index}.md`;
  }
  return path;
}
