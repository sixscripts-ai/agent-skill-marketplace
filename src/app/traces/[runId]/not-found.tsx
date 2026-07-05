import { AppShell } from "@/components/app-shell";
import { ActionGuide } from "@/components/feature-walkthrough";
import { ButtonLink, Panel } from "@/components/ui";

export default function TraceNotFound() {
  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <Panel className="p-6">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">Trace not found</div>
          <h1 className="mt-2 text-3xl font-semibold text-neutral-950">Run a skill to create a trace</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600">
            Traces are saved execution records. They appear after a sandbox run creates permission events, tool calls, output, and artifacts.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <ButtonLink href="/skills/agent-observer/run">Open Sandbox</ButtonLink>
            <ButtonLink href="/marketplace" variant="secondary">Choose a Skill</ButtonLink>
          </div>
        </Panel>
        <ActionGuide
          steps={[
            { label: "1", title: "Open Sandbox", body: "Pick a skill and enter a safe test prompt." },
            { label: "2", title: "Run", body: "Let the sandbox create events and output." },
            { label: "3", title: "Open trace", body: "Use the trace link after the run completes." },
            { label: "4", title: "Replay", body: "Return to the same context if something failed." },
            { label: "5", title: "Export", body: "Download JSON or workspace files when needed." },
          ]}
        />
      </div>
    </AppShell>
  );
}
