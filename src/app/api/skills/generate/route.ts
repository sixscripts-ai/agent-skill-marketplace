import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import { createXai } from "@ai-sdk/xai";
import { convertToModelMessages, streamText, tool } from "ai";
import { z } from "zod";
import { requireCurrentUser } from "@/lib/auth";
import { createSkillPackage } from "@/lib/repository";
import { buildFullSkillPackage, FULL_PACKAGE_PROFILE_LABEL } from "@/lib/skill-package-profile";

const allowedModels = new Set(["google/gemini-2.5-flash", "google/gemini-2.5-pro", "xai/grok-2-latest", "openai/gpt-4o", "anthropic/claude-3-5-sonnet-20240620", "groq/llama-3.3-70b-versatile", "groq/mixtral-8x7b-32768"]);
const permissionSchema = z.enum(["read_files", "write_files", "network", "shell", "browser", "api_keys"]);
const targetSchema = z.enum(["Codex", "Claude", "Antigravity", "OpenCode", "Grok", "VS Code"]);
const roleSchema = z.enum(["readme", "script", "asset", "reference", "config", "doc", "example", "other"]);
const requiredSections = ["Overview", "Activation", "Required Inputs", "Workflow", "Output Contract", "Available Scripts", "References", "Safety and Permissions", "Failure Handling", "Gotchas", "Examples", "Validation", "Compatibility"];

export async function POST(req: Request) {
  try {
    const { messages, model: requestedModel, currentSkill, currentFiles } = await req.json();
    if (!Array.isArray(messages)) return Response.json({ error: "Missing or invalid messages." }, { status: 400 });
    const user = await requireCurrentUser();
    const modelId = allowedModels.has(requestedModel) ? requestedModel : "google/gemini-2.5-flash";
    let apiKeys: Record<string, string> = {};
    try { apiKeys = JSON.parse(req.headers.get("x-api-keys") || "{}"); } catch { return Response.json({ error: "Stored API keys are invalid. Open API keys and save them again." }, { status: 400 }); }
    const aiModel = resolveModel(modelId, apiKeys);
    if (aiModel instanceof Response) return aiModel;
    const currentPackageContext = Array.isArray(currentFiles) ? currentFiles.slice(0, 30).map((file: { path?: unknown; content?: unknown }) => `FILE: ${typeof file.path === "string" ? file.path : "unknown-file"}\n${typeof file.content === "string" ? file.content.slice(0, 4000) : "[binary or empty]"}`).join("\n\n") : "No additional package files were provided.";
    const systemPrompt = `You are the primary AI Copilot for an Agent Skill Builder. Create and improve complete agent skill packages using the ${FULL_PACKAGE_PROFILE_LABEL}.

CURRENT SKILL.MD:\n${typeof currentSkill === "string" && currentSkill.trim() ? currentSkill : "No current skill was provided."}

CURRENT SUPPORTING FILES:\n${currentPackageContext}

Rules:
1. Use update_skill_markdown for every create, rewrite, repair, or improvement request.
2. Return exactly one human-readable H1 title. Never use H1 for body sections.
3. Use exact H2 headings for: ${requiredSections.join(", ")}.
4. Put allowed-tools at the top level of YAML frontmatter, never inside metadata.
5. metadata may contain author, version, and targets only.
6. Frontmatter name must equal the lowercase hyphenated directory name.
7. Description must begin with "Use this skill when..." and remain under 1024 characters.
8. Supported permissions: read_files, write_files, network, shell, browser, api_keys.
9. Supported targets: Codex, Claude, Antigravity, OpenCode, Grok, VS Code.
10. Keep SKILL.md under 500 lines and provide a realistic test prompt.`;
    const result = streamText({ model: aiModel, system: systemPrompt, messages: await convertToModelMessages(messages), tools: {
      update_skill_markdown: tool({
        description: `Create or replace a complete skill package conforming to ${FULL_PACKAGE_PROFILE_LABEL}.`,
        inputSchema: z.object({
          skillMd: z.string().min(200),
          files: z.array(z.object({ path: z.string().min(1), content: z.string(), role: roleSchema })).default([]),
          metadata: z.object({ displayName: z.string().min(4).max(64), directoryName: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), category: z.string().min(2).max(48), summary: z.string().min(40).max(1024), testPrompt: z.string().min(12).max(500), permissions: z.array(permissionSchema).min(1), targets: z.array(targetSchema).min(1) }),
        }),
        execute: async ({ skillMd, files, metadata }) => {
          const normalizedSkillMd = normalizeCopilotSkill(skillMd, metadata);
          const generated = buildFullSkillPackage({ skillMd: normalizedSkillMd, files, metadata });
          if (!generated.profile.valid) return { success: false, updatedContent: generated.skillMd, packageFiles: generated.files, metadata: generated.metadata, profile: generated.profile };
          const record = await createSkillPackage({ owner: user, uploadSource: "paste", originalFilename: `${generated.metadata.directoryName}.zip`, blobPrefix: `skills/${user.id}/${generated.metadata.directoryName}/${Date.now()}`, manifest: generated.manifest, files: generated.files });
          return { success: true, updatedContent: generated.skillMd, packageUploadId: record.id, packageFiles: record.files, metadata: generated.metadata, profile: generated.profile };
        },
      }),
    }});
    return result.toUIMessageStreamResponse({ onError: (error) => error instanceof Error ? error.message : "Copilot generation failed." });
  } catch (error) {
    console.error("AI Skill Chat Error:", error);
    return Response.json({ error: error instanceof Error ? error.message : "Copilot generation failed." }, { status: 500 });
  }
}

function resolveModel(modelId: string, apiKeys: Record<string, string>) {
  const provider = modelId.split("/")[0];
  const model = modelId.slice(provider.length + 1);
  const key = apiKeys[provider === "google" ? "google" : provider] || (provider === "google" ? process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY : provider === "xai" ? process.env.XAI_API_KEY : provider === "groq" ? process.env.GROQ_API_KEY : provider === "anthropic" ? process.env.ANTHROPIC_API_KEY : process.env.OPENAI_API_KEY) || "";
  if (!key) return Response.json({ error: `An API key is required for ${provider}.` }, { status: 400 });
  if (provider === "google") return createGoogleGenerativeAI({ apiKey: key })(model);
  if (provider === "xai") return createXai({ apiKey: key })(model);
  if (provider === "groq") return createGroq({ apiKey: key })(model);
  if (provider === "anthropic") return createAnthropic({ apiKey: key })(model);
  return createOpenAI({ apiKey: key })(model);
}

function normalizeCopilotSkill(skillMd: string, metadata: { displayName: string; directoryName: string; summary: string; permissions: string[]; targets: string[] }) {
  let body = skillMd.replace(/^---\s*\r?\n[\s\S]*?\r?\n---\s*/m, "").trim();
  for (const section of requiredSections) {
    const escaped = section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    body = body.replace(new RegExp(`^#\\s+${escaped}\\s*$`, "gim"), `## ${section}`);
  }
  body = body.replace(/^#\s+(Overview|Activation|Required Inputs|Workflow|Output Contract|Available Scripts|References|Safety and Permissions|Failure Handling|Gotchas|Examples|Validation|Compatibility)\s*$/gim, "## $1");
  body = body.replace(/^#\s+.+$/gm, "").trim();
  const safety = body.match(/^##\s+Safety and Permissions\s*$([\s\S]*?)(?=^##\s+|(?![\s\S]))/im)?.[1]?.trim() || metadata.permissions.map((permission) => `- ${permission}`).join("\n");
  if (!/^##\s+Permissions\s*$/im.test(body)) body += `\n\n## Permissions\n${safety}`;
  const frontmatter = `---\nname: ${metadata.directoryName}\ndescription: >-\n  ${metadata.summary.replace(/\s+/g, " ").trim()}\nlicense: MIT\ncompatibility: No external runtime dependencies unless documented below.\nmetadata:\n  author: marketplace-user\n  version: \"1.0.0\"\n  targets:\n${metadata.targets.map((target) => `    - ${target}`).join("\n")}\nallowed-tools:\n${metadata.permissions.map((permission) => `  - ${permission}`).join("\n")}\n---`;
  return `${frontmatter}\n\n# ${metadata.displayName}\n\n${body}\n`;
}
