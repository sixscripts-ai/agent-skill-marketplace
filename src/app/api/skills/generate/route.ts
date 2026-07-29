import { createAnthropic } from "@ai-sdk/anthropic";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import { createXai } from "@ai-sdk/xai";
import { convertToModelMessages, streamText, tool } from "ai";
import { z } from "zod";
import { AI_MODEL_IDS, DEFAULT_AI_MODEL, resolveAiModelId } from "@/lib/ai-model-catalog";
import { requireCurrentUser } from "@/lib/auth";
import { createSkillPackage } from "@/lib/repository";
import { buildFullSkillPackage, FULL_PACKAGE_PROFILE_LABEL } from "@/lib/skill-package-profile";

const permissionSchema = z.enum(["read_files", "write_files", "network", "shell", "browser", "api_keys"]);
const targetSchema = z.enum(["Codex", "Claude", "Antigravity", "OpenCode", "Grok", "VS Code"]);
const roleSchema = z.enum(["readme", "script", "asset", "reference", "config", "doc", "example", "other"]);
const requiredSections = ["Overview", "Activation", "Required Inputs", "Workflow", "Output Contract", "Available Scripts", "References", "Safety and Permissions", "Failure Handling", "Gotchas", "Examples", "Validation", "Compatibility"];

export async function POST(req: Request) {
  try {
    const { messages, model: requestedModel, currentSkill, currentFiles, discoveryReady } = await req.json();
    if (!Array.isArray(messages)) return Response.json({ error: "Missing or invalid messages." }, { status: 400 });
    const user = await requireCurrentUser();
    const modelId = resolveAiModelId(typeof requestedModel === "string" && AI_MODEL_IDS.has(requestedModel) ? requestedModel : DEFAULT_AI_MODEL);
    let apiKeys: Record<string, string> = {};
    try { apiKeys = JSON.parse(req.headers.get("x-api-keys") || "{}"); } catch { return Response.json({ error: "Stored API keys are invalid. Open API keys and save them again." }, { status: 400 }); }
    const aiModel = resolveModel(modelId, apiKeys);
    if (aiModel instanceof Response) return aiModel;
    const currentPackageContext = Array.isArray(currentFiles) ? currentFiles.slice(0, 30).map((file: { path?: unknown; content?: unknown }) => `FILE: ${typeof file.path === "string" ? file.path : "unknown-file"}\n${typeof file.content === "string" ? file.content.slice(0, 4000) : "[binary or empty]"}`).join("\n\n") : "No additional package files were provided.";
    const hasExistingSkill = typeof currentSkill === "string" && currentSkill.trim().length > 200;
    const waiveDiscovery = discoveryReady === true || hasExistingSkill;
    const systemPrompt = `You are the primary AI Copilot for an Agent Skill Builder. Create and improve complete agent skill packages using the ${FULL_PACKAGE_PROFILE_LABEL}.

CURRENT SKILL.MD:\n${typeof currentSkill === "string" && currentSkill.trim() ? currentSkill : "No current skill was provided."}

CURRENT SUPPORTING FILES:\n${currentPackageContext}

Discovery mode: ${waiveDiscovery ? "READY — you may write or update the package." : "REQUIRED — discover before writing."}

Rules:
1. If discovery is REQUIRED and the user has not answered discovery questions or said "generate anyway" / "I have enough", call clarify_skill_intent with 3–6 questions covering: job, user, inputs/outputs, success test, must-not-do, permissions. Do NOT call update_skill_markdown yet.
2. After the user answers discovery questions, or explicitly waives discovery, call update_skill_markdown once with a useful full package grounded in those answers.
3. When improving an existing skill, you may call update_skill_markdown directly.
4. Return exactly one human-readable H1 title. Never use H1 for body sections.
5. Use exact H2 headings for: ${requiredSections.join(", ")}.
6. Put allowed-tools at the top level of YAML frontmatter, never inside metadata.
7. metadata may contain author, version, and targets only.
8. Frontmatter name must equal the lowercase hyphenated directory name.
9. Description must begin with "Use this skill when..." and remain under 1024 characters.
10. Supported permissions: read_files, write_files, network, shell, browser, api_keys.
11. Supported targets: Codex, Claude, Antigravity, OpenCode, Grok, VS Code.
12. Keep SKILL.md under 500 lines and provide a realistic test prompt.
13. Put a short discovery summary (job, user, success) into Overview so usefulness is grounded.`;
    const result = streamText({
      model: aiModel,
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
      tools: {
        clarify_skill_intent: tool({
          description: "Ask discovery questions before writing SKILL.md. Use when the request is vague or discovery is still required.",
          inputSchema: z.object({
            message: z.string().min(12).max(800),
            questions: z.array(z.string().min(8).max(240)).min(3).max(6),
            discoverySummary: z.string().max(500).optional(),
          }),
          execute: async ({ message, questions, discoverySummary }) => ({
            ok: true,
            message,
            questions,
            discoverySummary: discoverySummary ?? "",
          }),
        }),
        update_skill_markdown: tool({
          description: `Create or replace a complete skill package conforming to ${FULL_PACKAGE_PROFILE_LABEL}. Only use after discovery is satisfied or waived.`,
          inputSchema: z.object({
            skillMd: z.string().min(200),
            files: z.array(z.object({ path: z.string().min(1), content: z.string(), role: roleSchema })).default([]),
            metadata: z.object({
              displayName: z.string().min(4).max(64),
              directoryName: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
              category: z.string().min(2).max(48),
              summary: z.string().min(40).max(1024),
              testPrompt: z.string().min(12).max(500),
              permissions: z.array(permissionSchema).min(1),
              targets: z.array(targetSchema).min(1),
              discoverySummary: z.string().max(500).optional(),
            }),
          }),
          execute: async ({ skillMd, files, metadata }) => {
            const normalizedSkillMd = normalizeCopilotSkill(skillMd, metadata);
            const generated = buildFullSkillPackage({ skillMd: normalizedSkillMd, files, metadata });
            if (!generated.profile.valid) {
              return {
                success: false,
                updatedContent: generated.skillMd,
                packageFiles: generated.files,
                metadata: generated.metadata,
                profile: generated.profile,
              };
            }
            const record = await createSkillPackage({
              owner: user,
              uploadSource: "paste",
              originalFilename: `${generated.metadata.directoryName}.zip`,
              blobPrefix: `skills/${user.id}/${generated.metadata.directoryName}/${Date.now()}`,
              manifest: generated.manifest,
              files: generated.files,
            });
            return {
              success: true,
              updatedContent: generated.skillMd,
              packageUploadId: record.id,
              packageFiles: record.files,
              metadata: generated.metadata,
              profile: generated.profile,
            };
          },
        }),
      },
    });
    return result.toUIMessageStreamResponse({ onError: (error) => (error instanceof Error ? error.message : "Copilot generation failed.") });
  } catch (error) {
    console.error("AI Skill Chat Error:", error);
    return Response.json({ error: error instanceof Error ? error.message : "Copilot generation failed." }, { status: 500 });
  }
}

function resolveModel(modelId: string, apiKeys: Record<string, string>) {
  const provider = modelId.split("/")[0];
  const model = modelId.slice(provider.length + 1);
  const key = apiKeys[provider] || (
    provider === "xai" ? process.env.XAI_API_KEY
      : provider === "groq" ? process.env.GROQ_API_KEY
        : provider === "anthropic" ? process.env.ANTHROPIC_API_KEY
          : provider === "deepseek" ? process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY
            : process.env.OPENAI_API_KEY
  ) || "";
  if (!key) return Response.json({ error: `An API key is required for ${provider}.` }, { status: 400 });
  if (provider === "xai") return createXai({ apiKey: key })(model);
  if (provider === "groq") return createGroq({ apiKey: key })(model);
  if (provider === "anthropic") return createAnthropic({ apiKey: key })(model);
  if (provider === "deepseek") return createOpenAI({ apiKey: key, baseURL: "https://api.deepseek.com" })(model);
  return createOpenAI({ apiKey: key })(model);
}

function normalizeCopilotSkill(skillMd: string, metadata: { displayName: string; directoryName: string; summary: string; permissions: string[]; targets: string[]; discoverySummary?: string }) {
  let body = skillMd.replace(/^---\s*\r?\n[\s\S]*?\r?\n---\s*/m, "").trim();
  for (const section of requiredSections) {
    const escaped = section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    body = body.replace(new RegExp(`^#\\s+${escaped}\\s*$`, "gim"), `## ${section}`);
  }
  body = body.replace(/^#\s+(Overview|Activation|Required Inputs|Workflow|Output Contract|Available Scripts|References|Safety and Permissions|Failure Handling|Gotchas|Examples|Validation|Compatibility)\s*$/gim, "## $1");
  body = body.replace(/^#\s+.+$/gm, "").trim();
  if (metadata.discoverySummary?.trim() && !/Discovery summary/i.test(body)) {
    body = body.replace(
      /^##\s+Overview\s*$/im,
      `## Overview\n\nDiscovery summary: ${metadata.discoverySummary.trim()}\n`,
    );
  }
  const safety = body.match(/^##\s+Safety and Permissions\s*$([\s\S]*?)(?=^##\s+|(?![\s\S]))/im)?.[1]?.trim() || metadata.permissions.map((permission) => `- ${permission}`).join("\n");
  if (!/^##\s+Permissions\s*$/im.test(body)) body += `\n\n## Permissions\n${safety}`;
  const frontmatter = `---\nname: ${metadata.directoryName}\ndescription: >-\n  ${metadata.summary.replace(/\s+/g, " ").trim()}\nlicense: MIT\ncompatibility: No external runtime dependencies unless documented below.\nmetadata:\n  author: marketplace-user\n  version: \"1.0.0\"\n  targets:\n${metadata.targets.map((target) => `    - ${target}`).join("\n")}\nallowed-tools:\n${metadata.permissions.map((permission) => `  - ${permission}`).join("\n")}\n---`;
  return `${frontmatter}\n\n# ${metadata.displayName}\n\n${body}\n`;
}
