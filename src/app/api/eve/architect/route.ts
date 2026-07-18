import { NextResponse } from "next/server";
import { generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import { createXai } from "@ai-sdk/xai";
import { requireCurrentUser } from "@/lib/auth";
import { securityErrorResponse } from "@/lib/api-errors";
import { getEveProject, saveEveProject, updateEveRun } from "@/lib/eve/persistence";
import type { AgentProject } from "@/lib/eve/agent-project";
import { mergeWorkspaceProject } from "@/lib/eve/workspace-project";
import { redactErrorMessage, redactSecrets } from "@/lib/eve/secrets";

export const maxDuration = 60;

type Msg = { role: "user" | "assistant"; content: string };
type Result =
  | { status: "clarify"; message: string; questions: string[]; plan: string[] }
  | { status: "update"; update: Partial<AgentProject>; plan: string[]; complete: boolean; continuationPrompt?: string };
type Body = {
  projectId: string;
  runId: string;
  prompt: string;
  modelId: string;
  apiKeys?: Record<string, string>;
  byok?: Record<string, boolean>;
  history?: Msg[];
  continuation?: string;
};

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  let body: Body | undefined;
  let user: Awaited<ReturnType<typeof requireCurrentUser>> | undefined;
  try {
    user = await requireCurrentUser();
    body = await request.json() as Body;
    validate(body);
    const stored = await getEveProject(body.projectId, user);
    const model = resolveModel(body.modelId, body.apiKeys ?? {}, body.byok ?? {});
    const { text } = await generateText({
      model,
      system: systemPrompt(stored.project, body.continuation),
      messages: (body.history ?? []).slice(-12).map((item) => ({ role: item.role, content: redactSecrets(item.content).slice(0, 12000) })),
    });
    const result = parseResult(text);
    let project = stored.project;
    if (result.status === "clarify") {
      await updateEveRun(body.runId, user, {
        status: "running",
        event: {
          type: "thought",
          status: "waiting",
          title: "Architect needs clarification",
          detail: result.message,
          metadata: { requestId, plan: result.plan, questions: result.questions },
        },
      });
    }
    if (result.status === "update") {
      project = mergeWorkspaceProject(project, result.update);
      await saveEveProject(body.projectId, user, project, { fromBuild: true });
      const filePaths = (result.update.files ?? []).map((file) => file.path).filter(Boolean);
      const skillIds = Array.isArray(result.update.skills)
        ? result.update.skills.map((skill) => {
            if (typeof skill === "string") return skill;
            const item = skill as { slug?: string; name?: string; id?: string };
            return item.slug || item.name || item.id || "";
          }).filter(Boolean)
        : [];
      await updateEveRun(body.runId, user, {
        status: "running",
        event: {
          type: "batch",
          status: "completed",
          title: "Architect batch saved",
          detail: `${filePaths.length} files created or changed`,
          metadata: {
            requestId,
            plan: result.plan,
            files: filePaths,
            skills: skillIds,
            complete: result.complete,
            modelId: body.modelId,
          },
        },
      });
    }
    return NextResponse.json({ result, project, requestId });
  } catch (error) {
    const detail = redactErrorMessage(error instanceof Error ? error.message : String(error));
    console.error("[eve-architect] request failed", { requestId, projectId: body?.projectId, runId: body?.runId, error: detail });
    if (user && body?.runId) {
      await updateEveRun(body.runId, user, {
        status: "failed",
        error: detail,
        event: {
          type: "error",
          status: "failed",
          title: "Architect request failed",
          detail,
          metadata: { requestId, modelId: body.modelId },
        },
      }).catch((persistError) => {
        console.error("[eve-architect] failed to persist error event", {
          requestId,
          runId: body?.runId,
          projectId: body?.projectId,
          error: redactErrorMessage(persistError instanceof Error ? persistError.message : String(persistError)),
        });
      });
    }
    const security = securityErrorResponse(error);
    if (security) return security;
    return NextResponse.json({ error: safeMessage(error), requestId }, { status: 400 });
  }
}

function validate(body: Body) {
  if (!body || typeof body !== "object") throw new Error("Invalid request body.");
  if (!body.projectId || !body.runId) throw new Error("Project and run identifiers are required.");
  if (!body.prompt?.trim()) throw new Error("A build request is required.");
  if (body.prompt.length > 20000) throw new Error("The build request is too large. Split it into smaller phases.");
  if (!body.modelId?.includes("/")) throw new Error("A valid provider/model identifier is required.");
}

function systemPrompt(project: AgentProject, continuation?: string) {
  return `You are Eve's production Agent Architect. Return exactly one JSON object and no markdown.
Clarification shape: {"status":"clarify","message":"...","questions":["..."],"plan":["..."]}
Update shape: {"status":"update","update":{...},"plan":["..."],"complete":true|false,"continuationPrompt":"..."}
Allowed project fields: metadata, brief, runtimeModel, runtime, tools, skills, permissions, tests, files. Preserve unrelated fields. Each file needs path and content. Do not include secrets. Keep this batch bounded to the most important changes.
Current project: ${JSON.stringify(project)}
Continuation: ${continuation || "None"}`;
}

function parseResult(text: string): Result {
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Architect returned no JSON object.");
  let value: unknown;
  try { value = JSON.parse(cleaned.slice(start, end + 1)); }
  catch { throw new Error("Architect returned invalid JSON. Retry with a smaller request."); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Architect returned an invalid response.");
  const result = value as Partial<Result> & Record<string, unknown>;
  if (result.status === "clarify" && typeof result.message === "string" && Array.isArray(result.questions) && Array.isArray(result.plan)) return result as Result;
  if (result.status === "update" && result.update && typeof result.update === "object" && Array.isArray(result.plan) && typeof result.complete === "boolean") return result as Result;
  throw new Error("Architect response did not match the required schema.");
}

/** Env-first: use server keys by default; browser keys only when BYOK is explicitly enabled for that provider. */
function resolveModel(modelId: string, keys: Record<string, string>, byok: Record<string, boolean>) {
  const provider = modelId.split("/")[0];
  const name = modelId.slice(provider.length + 1);
  const envKey = providerKey(provider);
  const useByok = byok[provider] === true;
  const key = useByok && keys[provider]?.trim() ? keys[provider].trim() : envKey;
  if (!key) {
    if (useByok) throw new Error(`BYOK is enabled for ${provider}, but no browser key was provided.`);
    throw new Error(`An API key is required for ${provider}. Configure the server environment key, or enable BYOK for this provider.`);
  }
  if (provider === "google") return createGoogleGenerativeAI({ apiKey: key })(name);
  if (provider === "xai") return createXai({ apiKey: key })(name);
  if (provider === "groq") return createGroq({ apiKey: key })(name);
  if (provider === "deepseek") return createOpenAI({ apiKey: key, baseURL: "https://api.deepseek.com" })(name);
  if (provider === "anthropic") return createAnthropic({ apiKey: key })(name);
  return createOpenAI({ apiKey: key })(name);
}

function providerKey(provider: string) {
  if (provider === "google") return process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "";
  if (provider === "xai") return process.env.XAI_API_KEY || "";
  if (provider === "groq") return process.env.GROQ_API_KEY || "";
  if (provider === "deepseek") return process.env.DEEPSEEK_API_KEY || "";
  if (provider === "anthropic") return process.env.ANTHROPIC_API_KEY || "";
  return process.env.OPENAI_API_KEY || "";
}

function safeMessage(error: unknown) {
  if (!(error instanceof Error)) return "Eve could not complete the request.";
  if (/API key|BYOK|required|invalid JSON|schema|too large|not found|owned/i.test(error.message)) return redactErrorMessage(error.message);
  return "Eve could not complete the architect request. Use the request reference to inspect server logs.";
}
