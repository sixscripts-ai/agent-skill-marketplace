import { z } from "zod";
import { createSkillPackage, createOrUpdateSkill, findSkillPackage } from "@/lib/repository";
import { detectRunnableCommands } from "@/lib/run-state";
import { streamRealShellSandboxRun } from "@/lib/real-shell-sandbox";
import { getSandboxReadiness } from "@/lib/sandbox-status";
import { buildFullSkillPackage, validateFullSkillPackage } from "@/lib/skill-package-profile";
import { parseSkillMarkdown } from "@/lib/skill-import";
import type {
  CompatibilityTarget,
  MarketplaceUser,
  PermissionKey,
  Skill,
  SkillDraftInput,
  SkillRun,
  WorkspaceFile,
} from "@/lib/types";
import { createEvidence, getEvidence, latestFreshProve } from "./evidence";
import { canPublishPublic } from "./publish-gate";
import { FORGE_NETWORK_ALLOWLIST, type ForgeEvidence, type ForgeToolName, type ForgeToolResult } from "./types";

const fileRoleSchema = z.enum([
  "skill_md",
  "readme",
  "script",
  "asset",
  "reference",
  "config",
  "doc",
  "example",
  "other",
]);

const fileSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
  role: fileRoleSchema.optional(),
});

const validateSchema = z.object({
  skillMd: z.string().min(1),
  directoryName: z.string().optional(),
  files: z.array(fileSchema).optional(),
});

const updateSchema = z.object({
  skillMd: z.string().min(1),
  skillName: z.string().optional(),
  slug: z.string().optional(),
  category: z.string().optional(),
  summary: z.string().optional(),
  permissions: z.array(z.string()).optional(),
  targets: z.array(z.string()).optional(),
  files: z.array(fileSchema).optional(),
  packageId: z.string().optional(),
});

const proveSchema = z.object({
  skillMd: z.string().min(1),
  skillName: z.string().optional(),
  slug: z.string().optional(),
  permissions: z.array(z.string()).optional(),
  files: z.array(fileSchema).optional(),
  command: z.string().optional(),
  networkAllowlist: z.array(z.string()).optional(),
});

const publishSchema = z.object({
  skillMd: z.string().min(1),
  skillName: z.string().min(1),
  slug: z.string().min(1),
  category: z.string().optional(),
  summary: z.string().optional(),
  permissions: z.array(z.string()).optional(),
  targets: z.array(z.string()).optional(),
  packageId: z.string().optional(),
  visibility: z.enum(["private", "unlisted"]).default("private"),
});

const publicPublishSchema = z.object({
  skillMd: z.string().min(1),
  skillName: z.string().min(1),
  slug: z.string().min(1),
  category: z.string().optional(),
  summary: z.string().optional(),
  permissions: z.array(z.string()).optional(),
  targets: z.array(z.string()).optional(),
  packageId: z.string().optional(),
  validationOk: z.boolean(),
  proveEvidenceId: z.string().optional(),
  userApprovedHighRisk: z.boolean().default(false),
});

export type ForgeToolContext = {
  user: MarketplaceUser;
  evidence: ForgeEvidence[];
};

export const forgeToolSchemas: Record<ForgeToolName, z.ZodTypeAny> = {
  validate_skill_package: validateSchema,
  update_skill_package: updateSchema,
  run_sandbox_prove: proveSchema,
  publish_skill_draft: publishSchema,
  request_public_publish: publicPublishSchema,
};

export async function executeForgeTool(
  tool: ForgeToolName,
  rawInput: unknown,
  ctx: ForgeToolContext,
): Promise<ForgeToolResult> {
  try {
    switch (tool) {
      case "validate_skill_package":
        return validateSkillPackage(validateSchema.parse(rawInput));
      case "update_skill_package":
        return updateSkillPackage(updateSchema.parse(rawInput), ctx.user);
      case "run_sandbox_prove":
        return runSandboxProve(proveSchema.parse(rawInput), ctx.user);
      case "publish_skill_draft":
        return publishSkillDraft(publishSchema.parse(rawInput), ctx.user);
      case "request_public_publish":
        return requestPublicPublish(publicPublishSchema.parse(rawInput), ctx);
      default:
        return { ok: false, error: `Unknown forge tool: ${tool as string}` };
    }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Forge tool failed." };
  }
}

function validateSkillPackage(input: z.infer<typeof validateSchema>): ForgeToolResult {
  const generated = buildFullSkillPackage({
    skillMd: input.skillMd,
    files: input.files,
    metadata: { directoryName: input.directoryName },
  });
  const profile = generated.profile.valid
    ? generated.profile
    : validateFullSkillPackage({
        skillMd: input.skillMd,
        directoryName: generated.metadata.directoryName,
        files: generated.files,
      });
  const evidence = createEvidence({
    kind: "validation",
    ok: profile.valid,
    summary: profile.valid ? "Skill package validation passed." : `Validation failed: ${profile.errors.join(" ")}`,
    details: { errors: profile.errors, warnings: profile.warnings, directoryName: profile.directoryName },
  });
  return {
    ok: profile.valid,
    data: { profile, metadata: generated.metadata, fileCount: generated.files.length },
    error: profile.valid ? undefined : profile.errors.join(" "),
    evidence,
  };
}

async function updateSkillPackage(input: z.infer<typeof updateSchema>, user: MarketplaceUser): Promise<ForgeToolResult> {
  const parsed = parseSkillMarkdown(input.skillMd);
  const generated = buildFullSkillPackage({
    skillMd: input.skillMd,
    files: input.files,
    metadata: {
      displayName: input.skillName || parsed.name,
      directoryName: input.slug || parsed.slug,
      category: input.category || parsed.category,
      summary: input.summary || parsed.description,
      permissions: input.permissions ?? parsed.permissions,
      targets: input.targets ?? parsed.compatibilityTargets,
    },
  });

  let packageId = input.packageId;
  if (packageId) {
    const existing = await findSkillPackage(packageId, user);
    if (!existing) return { ok: false, error: `Package not found: ${packageId}` };
  } else {
    const record = await createSkillPackage({
      owner: user,
      uploadSource: "paste",
      originalFilename: `${generated.metadata.directoryName}.zip`,
      blobPrefix: `skills/${user.id}/${generated.metadata.directoryName}/${Date.now()}`,
      manifest: generated.manifest,
      files: generated.files,
    });
    packageId = record.id;
  }

  return {
    ok: true,
    data: {
      packageId,
      skillMd: input.skillMd,
      metadata: generated.metadata,
      profile: generated.profile,
      permissions: generated.metadata.permissions,
    },
  };
}

async function runSandboxProve(input: z.infer<typeof proveSchema>, user: MarketplaceUser): Promise<ForgeToolResult> {
  const readiness = getSandboxReadiness();
  if (!readiness.realShellEnabled) {
    const evidence = createEvidence({
      kind: "sandbox_prove",
      ok: false,
      summary: "Sandbox prove unavailable: real shell disabled.",
      details: { code: "SANDBOX_DISABLED", readiness },
    });
    return {
      ok: false,
      error: "Real sandbox is disabled. Set ENABLE_REAL_SANDBOX=true to prove packages.",
      evidence,
    };
  }
  if (readiness.sandboxAuthStatus === "missing") {
    const evidence = createEvidence({
      kind: "sandbox_prove",
      ok: false,
      summary: "Sandbox prove unavailable: authentication missing.",
      details: { code: "SANDBOX_AUTH_MISSING", readiness },
    });
    return {
      ok: false,
      error: "Vercel Sandbox authentication is not configured for prove runs.",
      evidence,
    };
  }

  const parsed = parseSkillMarkdown(input.skillMd);
  const slug = (input.slug || parsed.slug || "forge-prove").slice(0, 64);
  const permissions = (input.permissions ?? parsed.permissions) as PermissionKey[];
  const skill = toDraftSkill({
    name: input.skillName || parsed.name,
    slug,
    category: parsed.category || "general",
    summary: parsed.description,
    skillMd: input.skillMd,
    permissions: permissions.length ? permissions : ["read_files", "shell"],
    compatibilityTargets: parsed.compatibilityTargets.length ? parsed.compatibilityTargets : ["Codex", "Claude"],
    visibility: "private",
  }, user);
  const workspaceFiles: WorkspaceFile[] = (input.files ?? []).map((file) => ({
    path: file.path,
    content: file.content,
    size: Buffer.byteLength(file.content),
    updatedAt: new Date().toISOString(),
  }));
  if (!workspaceFiles.some((file) => file.path === "SKILL.md" || file.path.endsWith("/SKILL.md"))) {
    workspaceFiles.push({
      path: "SKILL.md",
      content: input.skillMd,
      size: Buffer.byteLength(input.skillMd),
      updatedAt: new Date().toISOString(),
    });
  }

  const detected = detectRunnableCommands(skill, workspaceFiles);
  const command = input.command?.trim() || detected[0] || "test -f SKILL.md && wc -l SKILL.md";
  const networkAllowlist = input.networkAllowlist?.length
    ? input.networkAllowlist
    : [...FORGE_NETWORK_ALLOWLIST];

  let finalRun: Awaited<ReturnType<typeof collectRealShellRun>> | undefined;
  try {
    finalRun = await collectRealShellRun(skill, {
      owner: user,
      input: "Marketplace Forge sandbox prove",
      command,
      networkAllowlist,
      workspaceFiles,
    });
  } catch (error) {
    const evidence = createEvidence({
      kind: "sandbox_prove",
      ok: false,
      summary: "Sandbox prove failed before completion.",
      details: { error: error instanceof Error ? error.message : String(error), command },
    });
    return { ok: false, error: evidence.summary, evidence };
  }

  const ok = finalRun.status === "complete" && (finalRun.sandbox?.exitCode ?? 1) === 0;
  const evidence = createEvidence({
    kind: "sandbox_prove",
    ok,
    summary: ok
      ? `Sandbox prove passed with command: ${command}`
      : `Sandbox prove failed (status=${finalRun.status}, exitCode=${finalRun.sandbox?.exitCode ?? "n/a"}).`,
    details: {
      runId: finalRun.id,
      command,
      exitCode: finalRun.sandbox?.exitCode,
      status: finalRun.status,
      networkPolicy: finalRun.sandbox?.networkPolicy,
      latencyMs: finalRun.latencyMs,
      outputPreview: finalRun.output.slice(0, 500),
    },
  });
  return {
    ok,
    data: { runId: finalRun.id, command, exitCode: finalRun.sandbox?.exitCode, status: finalRun.status },
    error: ok ? undefined : evidence.summary,
    evidence,
  };
}

async function collectRealShellRun(
  skill: Skill,
  options: Parameters<typeof streamRealShellSandboxRun>[1],
) {
  let completeRun: SkillRun | null = null;
  for await (const payload of streamRealShellSandboxRun(skill, options)) {
    if (payload.kind === "complete") completeRun = payload.run;
  }
  if (!completeRun) {
    throw new Error("Sandbox prove did not return a complete run result.");
  }
  return completeRun;
}

async function publishSkillDraft(input: z.infer<typeof publishSchema>, user: MarketplaceUser): Promise<ForgeToolResult> {
  const draft = await ensureDraftInput(input, user, input.visibility);
  const skill = await createOrUpdateSkill(draft, user);
  const evidence = createEvidence({
    kind: "publish",
    ok: true,
    summary: `Published draft skill ${skill.slug} as ${skill.visibility ?? input.visibility}.`,
    details: { skillId: skill.id, slug: skill.slug, visibility: skill.visibility ?? input.visibility },
  });
  return { ok: true, data: { skill, packageId: draft.packageUploadId }, evidence };
}

async function requestPublicPublish(
  input: z.infer<typeof publicPublishSchema>,
  ctx: ForgeToolContext,
): Promise<ForgeToolResult> {
  const permissions = input.permissions ?? parseSkillMarkdown(input.skillMd).permissions;
  const latestProve = input.proveEvidenceId
    ? getEvidence(input.proveEvidenceId)
    : latestFreshProve(ctx.evidence);
  const gate = canPublishPublic({
    validationOk: input.validationOk,
    latestProve,
    permissions,
    userApprovedHighRisk: input.userApprovedHighRisk,
  });
  if (!gate.ok) {
    return { ok: false, error: gate.reason, data: { proveEvidenceId: latestProve?.id } };
  }
  const draft = await ensureDraftInput(input, ctx.user, "public");
  const skill = await createOrUpdateSkill(draft, ctx.user);
  const evidence = createEvidence({
    kind: "publish",
    ok: true,
    summary: `Published skill ${skill.slug} publicly after gate checks.`,
    details: {
      skillId: skill.id,
      slug: skill.slug,
      visibility: "public",
      proveEvidenceId: latestProve?.id,
    },
  });
  return { ok: true, data: { skill, packageId: draft.packageUploadId }, evidence };
}

async function ensureDraftInput(
  input: {
    skillMd: string;
    skillName: string;
    slug: string;
    category?: string;
    summary?: string;
    permissions?: string[];
    targets?: string[];
    packageId?: string;
  },
  user: MarketplaceUser,
  visibility: "public" | "private" | "unlisted",
): Promise<SkillDraftInput> {
  const parsed = parseSkillMarkdown(input.skillMd);
  const permissions = (input.permissions ?? parsed.permissions) as PermissionKey[];
  const targets = (input.targets ?? parsed.compatibilityTargets) as CompatibilityTarget[];
  let packageUploadId = input.packageId;
  if (!packageUploadId) {
    const generated = buildFullSkillPackage({
      skillMd: input.skillMd,
      metadata: {
        displayName: input.skillName,
        directoryName: input.slug,
        category: input.category || parsed.category,
        summary: input.summary || parsed.description,
        permissions,
        targets,
      },
    });
    const record = await createSkillPackage({
      owner: user,
      uploadSource: "paste",
      originalFilename: `${generated.metadata.directoryName}.zip`,
      blobPrefix: `skills/${user.id}/${generated.metadata.directoryName}/${Date.now()}`,
      manifest: generated.manifest,
      files: generated.files,
    });
    packageUploadId = record.id;
  }
  return {
    name: input.skillName,
    slug: input.slug,
    category: input.category || parsed.category || "general",
    summary: input.summary || parsed.description,
    skillMd: input.skillMd,
    permissions: permissions.length ? permissions : ["read_files"],
    compatibilityTargets: targets.length ? targets : ["Codex", "Claude", "VS Code"],
    visibility,
    packageUploadId,
  };
}

function toDraftSkill(draft: SkillDraftInput, user: MarketplaceUser): Skill {
  return {
    id: `draft-${draft.slug}`,
    slug: draft.slug,
    name: draft.name,
    summary: draft.summary,
    category: draft.category,
    trustLevel: "Experimental",
    author: user.name,
    ownerId: user.id,
    visibility: draft.visibility,
    installCount: 0,
    rating: 0,
    currentVersion: "draft",
    permissions: draft.permissions.map((key) => ({
      key,
      reason: `Declared by Marketplace Forge draft: ${key}.`,
      risk: key === "shell" || key === "api_keys" ? "high" : key === "network" || key === "write_files" ? "medium" : "low",
    })),
    versions: [
      {
        version: "draft",
        skillMd: draft.skillMd,
        readme: `# ${draft.name}\n\n${draft.summary}`,
        changelog: "Forge prove draft.",
        compatibilityTargets: draft.compatibilityTargets,
        createdAt: new Date().toISOString().slice(0, 10),
      },
    ],
    evalSuites: [],
    installTargets: [],
    reviews: [],
  };
}
