import { AppShell } from "@/components/app-shell";
import { CodeBlock } from "@/components/code-block";
import { SafeMessageResponse } from "@/components/safe-message-response";
import { Badge, ButtonLink, Panel } from "@/components/ui";

const recommendedBundles = [
  {
    name: "Runner Console + Skill Chat Lab",
    value: "Installed next",
    description: "Combine chat input, suggestions, trace summary, terminal output, tool calls, approvals, file tree, and markdown artifacts.",
    command:
      "pnpm dlx shadcn@latest add https://elements.ai-sdk.dev/api/registry/conversation.json https://elements.ai-sdk.dev/api/registry/prompt-input.json https://elements.ai-sdk.dev/api/registry/suggestion.json https://elements.ai-sdk.dev/api/registry/reasoning.json https://elements.ai-sdk.dev/api/registry/terminal.json https://elements.ai-sdk.dev/api/registry/tool.json https://elements.ai-sdk.dev/api/registry/file-tree.json https://elements.ai-sdk.dev/api/registry/confirmation.json",
    components: ["conversation", "prompt-input", "suggestion", "reasoning", "terminal", "tool", "file-tree", "confirmation"],
  },
  {
    name: "Eval + Debug View",
    value: "Best developer proof",
    description: "Make evals and failures feel serious with test results, stack traces, code blocks, env displays, and package metadata.",
    command:
      "pnpm dlx shadcn@latest add https://elements.ai-sdk.dev/api/registry/test-results.json https://elements.ai-sdk.dev/api/registry/stack-trace.json https://elements.ai-sdk.dev/api/registry/code-block.json https://elements.ai-sdk.dev/api/registry/environment-variables.json https://elements.ai-sdk.dev/api/registry/package-info.json",
    components: ["test-results", "stack-trace", "code-block", "environment-variables", "package-info"],
  },
  {
    name: "Workflow Backplane",
    value: "Later",
    description: "Use durable workflow orchestration only when runs need long-lived retries, resumability, and background scheduling.",
    command: "pnpm add workflow",
    components: ["checkpoint", "task", "queue", "agent"],
  },
];

const groups = [
  {
    title: "Chatbot",
    items: [
      ["conversation", "Scrollable message history with jump-to-bottom behavior."],
      ["message", "Already installed. Renders AI markdown safely through MessageResponse."],
      ["prompt-input", "Textarea, submit controls, attachments, and keyboard behavior."],
      ["reasoning", "Collapsible model reasoning or analysis panels."],
      ["tool", "Tool call inputs, outputs, status, and error display."],
      ["sources", "Source lists for research and citation-backed outputs."],
      ["inline-citation", "Inline source references inside generated text."],
      ["suggestion", "Follow-up prompts and guided next actions."],
      ["confirmation", "Approval UI for risky tools such as shell/network/write."],
    ],
  },
  {
    title: "Code",
    items: [
      ["terminal", "Live stdout/stderr for real shell sandbox runs."],
      ["file-tree", "Uploaded package and workspace file browser."],
      ["artifact", "Rendered previews for generated outputs."],
      ["sandbox", "Tabbed code plus execution output preview."],
      ["test-results", "Eval suite results with failures and stats."],
      ["stack-trace", "Readable runtime errors with collapsible frames."],
      ["environment-variables", "Masked env var display for setup/debug pages."],
      ["package-info", "Dependency and package metadata display."],
      ["snippet", "Copyable commands and install steps."],
    ],
  },
  {
    title: "Workflow",
    items: [
      ["canvas", "Visual workflow canvas for skill dependency maps."],
      ["node", "Workflow node blocks for agent steps."],
      ["edge", "Connections between nodes."],
      ["panel", "Inspector panels for selected steps."],
      ["controls", "Zoom/pan controls for workflow diagrams."],
      ["checkpoint", "Saved run states and approval milestones."],
      ["task", "Queued, running, complete, and failed task states."],
    ],
  },
  {
    title: "Voice",
    items: [
      ["persona", "Animated voice-agent visual state."],
      ["speech-input", "Browser speech capture for prompts."],
      ["transcription", "Synced transcript display."],
      ["audio-player", "Playback controls for generated or uploaded audio."],
      ["mic-selector", "Input device picker."],
      ["voice-selector", "Voice picker for speech output."],
    ],
  },
  {
    title: "Utilities",
    items: [
      ["image", "AI image display."],
      ["web-preview", "Iframe preview for generated web pages."],
      ["jsx-preview", "Preview generated React/JSX output."],
      ["attachments", "Attached files and uploaded context display."],
      ["model-selector", "Model/provider picker UI."],
      ["shimmer", "AI-native loading placeholders."],
    ],
  },
];

const markdownExample = `# Sandbox Run Output

**Skill:** Sandbox Script Runner  
**Command:** \`npm test\`  
**Status:** blocked until shell approval

## Trace Summary

| Step | Result |
| --- | --- |
| Permission check | shell requires approval |
| File mount | 14 package files ready |
| Network policy | deny-all |

### Next action

Approve shell execution, then rerun with a 60 second timeout.`;

export default function AiElementsPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-neutral-950">AI Elements Lab</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
              Pick targeted AI Elements for the marketplace runner, trace viewer, evals, and skill builder. This app already uses
              <span className="font-semibold text-neutral-950"> message</span> through the safe markdown wrapper.
            </p>
          </div>
          <ButtonLink href="/skills/agent-observer/run">Open Runner</ButtonLink>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-6">
            <Panel className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-neutral-950">Recommended bundles</h2>
                  <p className="mt-1 text-sm text-neutral-600">Choose one bundle instead of installing the whole registry.</p>
                </div>
                <Badge tone="green">message installed</Badge>
              </div>
              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                {recommendedBundles.map((bundle, index) => (
                  <article key={bundle.name} className="rounded-xl border border-neutral-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="grid size-8 place-items-center rounded-md bg-neutral-950 font-mono text-xs font-semibold text-white">
                        {index + 1}
                      </div>
                      <Badge tone={index === 0 ? "green" : bundle.value === "Later" ? "amber" : "neutral"}>{bundle.value}</Badge>
                    </div>
                    <h3 className="mt-4 font-semibold text-neutral-950">{bundle.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-neutral-600">{bundle.description}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {bundle.components.map((component) => (
                        <Badge key={component}>{component}</Badge>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </Panel>

            <Panel className="p-5">
              <h2 className="text-lg font-semibold text-neutral-950">Component menu</h2>
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                {groups.map((group) => (
                  <section key={group.title} className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                    <h3 className="font-semibold text-neutral-950">{group.title}</h3>
                    <div className="mt-4 divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
                      {group.items.map(([name, description]) => (
                        <div key={name} className="grid gap-1 px-3 py-3 sm:grid-cols-[150px_1fr]">
                          <code className="font-mono text-xs font-semibold text-neutral-950">{name}</code>
                          <p className="text-sm leading-5 text-neutral-600">{description}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </Panel>
          </div>

          <aside className="space-y-6">
            <Panel className="p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-neutral-950">Live markdown example</h2>
                <Badge tone="blue">MessageResponse</Badge>
              </div>
              <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                <SafeMessageResponse>{markdownExample}</SafeMessageResponse>
              </div>
            </Panel>

            <Panel className="p-5">
              <h2 className="text-lg font-semibold text-neutral-950">Install commands</h2>
              <p className="mt-1 text-sm text-neutral-600">Run one bundle at a time, then wire it into the matching app surface.</p>
              <div className="mt-4 space-y-4">
                {recommendedBundles.map((bundle) => (
                  <div key={bundle.name}>
                    <div className="mb-2 text-sm font-semibold text-neutral-950">{bundle.name}</div>
                    <CodeBlock code={bundle.command} />
                  </div>
                ))}
              </div>
            </Panel>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
