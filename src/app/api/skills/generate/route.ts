import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createXai } from "@ai-sdk/xai";
import { createGroq } from "@ai-sdk/groq";
import { convertToModelMessages, streamText, tool } from "ai";
import { z } from "zod";
import { requireCurrentUser } from "@/lib/auth";
import { createSkillPackage } from "@/lib/repository";
import {
  buildFullSkillPackage,
  FULL_PACKAGE_PROFILE_LABEL,
} from "@/lib/skill-package-profile";

const allowedModels = new Set([
  "google/gemini-2.5-flash",
  "google/gemini-2.5-pro",
  "xai/grok-2-latest",
  "openai/gpt-4o",
  "anthropic/claude-3-5-sonnet-20240620",
  "groq/llama-3.3-70b-versatile",
  "groq/mixtral-8x7b-32768",
]);

const permissionSchema = z.enum(["read_files", "write_files", "network", "shell", "browser", "api_keys"]);
const targetSchema = z.enum(["Codex", "Claude", "Antigravity", "OpenCode", "Grok", "VS Code"]);
const roleSchema = z.enum(["readme", "script", "asset", "reference", "config", "doc", "example", "other"]);

export async function POST(req: Request) {
  try {
    const { messages, model: requestedModel, currentSkill, currentFiles } = await req.json();
    if (!Array.isArray(messages)) {
      return Response.json({ error: "Missing or invalid messages." }, { status: 400 });
    }

    const user = await requireCurrentUser();
    const modelId = allowedModels.has(requestedModel) ? requestedModel : "google/gemini-2.5-flash";
    const apiKeysHeader = req.headers.get("x-api-keys");
    let apiKeys: Record<string, string> = {};
    try {
      apiKeys = apiKeysHeader ? JSON.parse(apiKeysHeader) : {};
    } catch {
      return Response.json({ error: "Stored API keys are invalid. Open API keys and save them again." }, { status: 400 });
    }

    let aiModel;
    if (modelId.startsWith("anthropic/")) {
      const key = apiKeys.anthropic || process.env.ANTHROPIC_API_KEY || "";
      if (!key) return Response.json({ error: "An Anthropic API key is required for this model." }, { status: 400 });
      aiModel = createAnthropic({ apiKey: key })(modelId.replace("anthropic/", ""));
    } else if (modelId.startsWith("google/")) {
      const key = apiKeys.google || process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "";
      if (!key) return Response.json({ error: "A Google Gemini API key is required for this model." }, { status: 400 });
      aiModel = createGoogleGenerativeAI({ apiKey: key })(modelId.replace("google/", ""));
    } else if (modelId.startsWith("xai/")) {
      const key = apiKeys.xai || process.env.XAI_API_KEY || "";
      if (!key) return Response.json({ error: "An xAI API key is required for this model." }, { status: 400 });
      aiModel = createXai({ apiKey: key })(modelId.replace("xai/", ""));
    } else if (modelId.startsWith("groq/")) {
      const key = apiKeys.groq || process.env.GROQ_API_KEY || "";
      if (!key) return Response.json({ error: "A Groq API key is required for this model." }, { status: 400 });
      aiModel = createGroq({ apiKey: key })(modelId.replace("groq/", ""));
    } else {
      const key = apiKeys.openai || process.env.OPENAI_API_KEY || "";
      if (!key) return Response.json({ error: "An OpenAI API key is required for this model." }, { status: 400 });
      aiModel = createOpenAI({ apiKey: key })(modelId.replace("openai/", ""));
    }


    const currentPackageContext = Array.isArray(currentFiles)
      ? currentFiles
          .slice(0, 30)
          .map((file: { path?: unknown; content?: unknown }) => {
            const path = typeof file.path === "string" ? file.path : "unknown-file";
            const content = typeof file.content === "string" ? file.content.slice(0, 4000) : "[binary or empty]";
            return `FILE: ${path}\n${content}`;
          })
          .join("\n\n")
      : "No additional package files were provided.";

    const systemPrompt = `You are the primary AI Copilot for an Agent Skill Builder.

Create and improve complete agent skill packages using the ${FULL_PACKAGE_PROFILE_LABEL}. Never generate application code unless the skill itself explicitly requires a bundled helper script.

CURRENT SKILL.MD:
${typeof currentSkill === "string" && currentSkill.trim() ? currentSkill : "No current skill was provided."}

CURRENT SUPPORTING FILES:
${currentPackageContext}

Mandatory package rules:
1. Use the update_skill_markdown tool whenever the user asks to create, rewrite, repair, or improve a skill.
2. The package directory and YAML frontmatter name must be the same lowercase hyphenated identifier.
3. The YAML description must be 1024 characters or fewer and begin with "Use this skill when...". Include direct and indirect activation triggers.
4. Include license, runtime compatibility requirements, metadata.author, metadata.version, metadata.targets, and allowed-tools. The compatibility frontmatter field describes runtime requirements, not marketplace targets.
5. Keep SKILL.md under 500 lines.
6. Include these exact H2 sections: Overview, Activation, Required Inputs, Workflow, Output Contract, Available Scripts, References, Safety and Permissions, Failure Handling, Gotchas, Examples, Validation, Compatibility.
7. In References, state exact load conditions such as: Read \`references/api-errors.md\` when the API returns a 404.
8. Scripts must be non-interactive, accept CLI flags, handle failures, and prefer structured output. Only create scripts that materially improve the skill.
9. Keep reference files focused, relative to the skill root, and one level deep under references/.
10. The server automatically scaffolds scripts/, references/, assets/, and examples/ when omitted. Do not invent meaningless scripts or assets.
11. Supported permissions are only: read_files, write_files, network, shell, browser, api_keys.
12. Supported marketplace targets are only: Codex, Claude, Antigravity, OpenCode, Grok, VS Code.
13. Return a human-readable display name separately from the machine directory name.
14. Supply a realistic test prompt and a marketplace category.
15. After the tool succeeds, summarize the package files and validation result without pasting the complete SKILL.md into chat.`;

    const result = streamText({
      model: aiModel,
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
      tools: {
        update_skill_markdown: tool({
          description: `Create or replace a complete skill package that conforms to ${FULL_PACKAGE_PROFILE_LABEL}.`,
          inputSchema: z.object({
            skillMd: z.string().min(200).describe("Complete SKILL.md with YAML frontmatter and all required H2 sections."),
            files: z.array(z.object({
              path: z.string().min(1).describe("Path relative to the skill root, such as references/platform-rules.md."),
              content: z.string().describe("UTF-8 text file contents."),
              role: roleSchema,
            })).default([]),
            metadata: z.object({
              displayName: z.string().min(4).max(64),
              directoryName: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
              category: z.string().min(2).max(48),
              summary: z.string().min(40).max(1024),
              testPrompt: z.string().min(12).max(500),
              permissions: z.array(permissionSchema).min(1),
              targets: z.array(targetSchema).min(1),
            }),
          }),
          execute: async ({ skillMd, files, metadata }) => {
            const generated = buildFullSkillPackage({ skillMd, files, metadata });
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

    return result.toUIMessageStreamResponse({
      onError: (error) => error instanceof Error ? error.message : "Copilot generation failed.",
    });
  } catch (error) {
    console.error("AI Skill Chat Error:", error);
    return Response.json({ error: error instanceof Error ? error.message : "Copilot generation failed." }, { status: 500 });
  }
}
