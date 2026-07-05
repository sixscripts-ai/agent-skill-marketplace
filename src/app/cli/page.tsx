import { AppShell } from "@/components/app-shell";
import { CodeBlock } from "@/components/code-block";
import { ButtonLink, Panel } from "@/components/ui";

export default function CliPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <Panel className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold text-white">Agent Skill CLI</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                Download a portable Node CLI that installs skill packages and starts live browser-sandbox runs against this marketplace.
              </p>
            </div>
            <ButtonLink href="/api/cli" variant="secondary">Download CLI zip</ButtonLink>
          </div>
        </Panel>
        <Panel className="p-5">
          <h2 className="font-semibold text-white">Usage</h2>
          <div className="mt-4">
            <CodeBlock
              code={`unzip agent-skill-cli.zip\nchmod +x bin/agent-skill.mjs\nAGENT_SKILL_MARKETPLACE_URL=http://localhost:3000 ./bin/agent-skill.mjs install agent-observer\nAGENT_SKILL_MARKETPLACE_URL=http://localhost:3000 ./bin/agent-skill.mjs run agent-observer`}
            />
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
