import { parseSkillMarkdown } from "@/lib/skill-import";
import type { MarketplaceUser } from "@/lib/types";
import { FORGE_SYSTEM_INSTRUCTIONS } from "./instructions";
import { buildMetrics } from "./metrics";
import { executeForgeTool } from "./tools";
import {
  FORGE_MAX_BATCHES,
  FORGE_MAX_STEPS,
  type ForgeEvidence,
  type ForgeEvent,
  type ForgeLoopOptions,
  type ForgeToolName,
  type ForgeToolResult,
} from "./types";

export type ForgeLoopInput = {
  goal: string;
  user: MarketplaceUser;
  packageId?: string;
  skillMarkdown?: string;
  skillName?: string;
  slug?: string;
  files?: Array<{ path: string; content: string }>;
  continuation?: string;
  confirmDestructive?: boolean;
  approvePublic?: boolean;
  userApprovedHighRisk?: boolean;
  visibility?: "public" | "private" | "unlisted";
  batch?: number;
} & ForgeLoopOptions;

type LoopState = {
  steps: number;
  toolCounts: Partial<Record<ForgeToolName, number>>;
  startedAt: number;
  hitlCount: number;
  evidence: ForgeEvidence[];
  packageId?: string;
  skillMd?: string;
  skillName?: string;
  slug?: string;
  permissions: string[];
  validationOk: boolean;
  latestProve?: ForgeEvidence;
  batch: number;
};

export async function* runForgeLoop(input: ForgeLoopInput): AsyncGenerator<ForgeEvent> {
  const maxSteps = Math.min(Math.max(input.maxSteps ?? FORGE_MAX_STEPS, 1), FORGE_MAX_STEPS);
  const maxBatches = Math.min(Math.max(input.maxBatches ?? FORGE_MAX_BATCHES, 1), FORGE_MAX_BATCHES);
  const batch = Math.max(1, input.batch ?? 1);
  const parsed = input.skillMarkdown ? parseSkillMarkdown(input.skillMarkdown) : undefined;

  const state: LoopState = {
    steps: 0,
    toolCounts: {},
    startedAt: Date.now(),
    hitlCount: 0,
    evidence: [],
    packageId: input.packageId,
    skillMd: input.skillMarkdown,
    skillName: input.skillName || parsed?.name,
    slug: input.slug || parsed?.slug,
    permissions: parsed?.permissions ?? [],
    validationOk: false,
    batch,
  };

  yield {
    type: "message",
    role: "assistant",
    content: FORGE_SYSTEM_INSTRUCTIONS.split("\n")[0] ?? "Marketplace Forge ready.",
  };

  const planSteps = [
    "Plan forge lifecycle",
    ...(state.skillMd ? ["Update skill package"] : []),
    "Validate skill package",
    "Run sandbox prove",
    "Publish private/unlisted draft",
    ...(input.approvePublic || input.visibility === "public" ? ["Request public publish"] : []),
  ];
  yield { type: "plan", steps: planSteps };

  if (input.continuation) {
    yield {
      type: "message",
      role: "assistant",
      content: `Continuing batch ${batch}: ${input.continuation}`,
    };
  }

  if (!state.skillMd) {
    state.hitlCount += 1;
    yield {
      type: "hitl",
      reason: "Provide skillMarkdown (or a package with SKILL.md) to continue the forge loop.",
      action: "clarify",
    };
    return;
  }

  if (state.steps < maxSteps) {
    for await (const event of invokeTool(state, input.user, "update_skill_package", {
      skillMd: state.skillMd,
      skillName: state.skillName,
      slug: state.slug,
      permissions: state.permissions,
      files: input.files,
      packageId: state.packageId,
    })) {
      yield event;
      if (event.type === "tool_result" && event.result.ok && event.result.data && typeof event.result.data === "object") {
        const data = event.result.data as {
          packageId?: string;
          metadata?: { displayName?: string; directoryName?: string; permissions?: string[] };
        };
        state.packageId = data.packageId ?? state.packageId;
        state.skillName = data.metadata?.displayName ?? state.skillName;
        state.slug = data.metadata?.directoryName ?? state.slug;
        state.permissions = data.metadata?.permissions ?? state.permissions;
      }
    }
  }

  if (state.steps < maxSteps) {
    for await (const event of invokeTool(state, input.user, "validate_skill_package", {
      skillMd: state.skillMd,
      directoryName: state.slug,
      files: input.files,
    })) {
      yield event;
      if (event.type === "tool_result") {
        state.validationOk = event.result.ok;
        trackEvidence(state, event.result);
      }
    }
  }

  if (state.steps < maxSteps) {
    for await (const event of invokeTool(state, input.user, "run_sandbox_prove", {
      skillMd: state.skillMd,
      skillName: state.skillName,
      slug: state.slug,
      permissions: state.permissions,
      files: input.files,
    })) {
      yield event;
      if (event.type === "tool_result") {
        trackEvidence(state, event.result);
        if (event.result.evidence?.ok) state.latestProve = event.result.evidence;
      }
    }
  }

  if (state.steps < maxSteps && state.skillName && state.slug) {
    const draftVisibility = input.visibility === "unlisted" ? "unlisted" : "private";
    for await (const event of invokeTool(state, input.user, "publish_skill_draft", {
      skillMd: state.skillMd,
      skillName: state.skillName,
      slug: state.slug,
      permissions: state.permissions,
      packageId: state.packageId,
      visibility: draftVisibility,
    })) {
      yield event;
      if (event.type === "tool_result") {
        trackEvidence(state, event.result);
        if (event.result.ok && event.result.data && typeof event.result.data === "object") {
          const data = event.result.data as { packageId?: string };
          state.packageId = data.packageId ?? state.packageId;
        }
      }
    }
  }

  const wantsPublic = Boolean(input.approvePublic || input.visibility === "public");
  if (wantsPublic && state.skillName && state.slug) {
    if (!input.approvePublic) {
      state.hitlCount += 1;
      yield {
        type: "hitl",
        reason: "Public publish requires explicit approvePublic confirmation after validate + prove.",
        action: "approve_publish",
      };
      if (batch < maxBatches) {
        yield {
          type: "continuation",
          prompt: "Resume after approvePublic to request public publish.",
          batch: batch + 1,
        };
      }
      return;
    }

    const needsHighRisk = state.permissions.some((permission) => permission === "shell" || permission === "api_keys");
    if (needsHighRisk && !input.userApprovedHighRisk) {
      state.hitlCount += 1;
      yield {
        type: "hitl",
        reason: "High-risk permissions require userApprovedHighRisk before public publish.",
        action: "approve_publish",
      };
      if (batch < maxBatches) {
        yield {
          type: "continuation",
          prompt: "Resume with userApprovedHighRisk=true after reviewing shell/api_keys permissions.",
          batch: batch + 1,
        };
      }
      return;
    }

    if (state.steps < maxSteps) {
      let publicOk = false;
      let publicError = "Public publish gate rejected this request.";
      for await (const event of invokeTool(state, input.user, "request_public_publish", {
        skillMd: state.skillMd,
        skillName: state.skillName,
        slug: state.slug,
        permissions: state.permissions,
        packageId: state.packageId,
        validationOk: state.validationOk,
        proveEvidenceId: state.latestProve?.id,
        userApprovedHighRisk: Boolean(input.userApprovedHighRisk),
      })) {
        yield event;
        if (event.type === "tool_result") {
          trackEvidence(state, event.result);
          publicOk = event.result.ok;
          if (event.result.error) publicError = event.result.error;
        }
      }
      if (!publicOk) {
        state.hitlCount += 1;
        yield { type: "hitl", reason: publicError, action: "approve_publish" };
        if (batch < maxBatches) {
          yield {
            type: "continuation",
            prompt: "Fix validation/prove evidence, then approve public publish again.",
            batch: batch + 1,
          };
        }
        return;
      }
    }
  }

  if (state.steps >= maxSteps && batch < maxBatches) {
    yield {
      type: "continuation",
      prompt: `Step budget reached (${maxSteps}). Continue remaining forge work.`,
      batch: batch + 1,
    };
    return;
  }

  yield {
    type: "message",
    role: "assistant",
    content: summarize(state, input.goal),
  };

  yield {
    type: "complete",
    packageId: state.packageId,
    evidenceIds: state.evidence.map((item) => item.id),
    metrics: buildMetrics(state),
  };
}

async function* invokeTool(
  state: LoopState,
  user: MarketplaceUser,
  tool: ForgeToolName,
  toolInput: unknown,
): AsyncGenerator<ForgeEvent> {
  state.steps += 1;
  state.toolCounts[tool] = (state.toolCounts[tool] ?? 0) + 1;
  yield { type: "tool_start", tool, input: toolInput };
  const result = await executeForgeTool(tool, toolInput, { user, evidence: state.evidence });
  yield { type: "tool_result", tool, result };
}

function trackEvidence(state: LoopState, result: ForgeToolResult) {
  if (result.evidence) state.evidence.push(result.evidence);
}

function summarize(state: LoopState, goal: string) {
  const ok = state.evidence.filter((item) => item.ok).length;
  return `Forge finished for goal "${goal}". packageId=${state.packageId ?? "none"}; evidenceOk=${ok}/${state.evidence.length}; validation=${state.validationOk ? "ok" : "failed"}; prove=${state.latestProve?.ok ? "ok" : "missing_or_failed"}.`;
}
