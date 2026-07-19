import { AppShell } from "@/components/app-shell";
import { CodeBlock } from "@/components/code-block";
import {
  FirebenchCode,
  FirebenchHeroCard,
  FirebenchHeroIntro,
  FirebenchPage,
  FirebenchTag,
} from "@/components/firebench";

export default function CliPage() {
  return (
    <AppShell mode="wide" sidebarDefaultOpen={false}>
      <FirebenchPage heat="bold" canvas>
        <FirebenchHeroIntro
          kicker="// CLI //"
          title="Agent Skill"
          accent="CLI"
          lead="Download a portable Node CLI that installs skill packages and starts live browser-sandbox runs against this marketplace."
        />

        <div className="fb-tags">
          <FirebenchTag>[ INSTALL ]</FirebenchTag>
          <FirebenchTag>[ RUN ]</FirebenchTag>
          <FirebenchTag>[ SANDBOX ]</FirebenchTag>
        </div>

        <FirebenchHeroCard
          actionsLeft={<FirebenchTag>[ READY ]</FirebenchTag>}
          actionsRight={
            <a href="/api/cli" className="fb-cta fb-cta--primary">
              Download CLI zip
            </a>
          }
        >
          <p className="fb-section-note m-0 mb-3">
            Unzip, point at your marketplace URL, then install and run a skill in one pass.
          </p>
          <CodeBlock
            code={`unzip agent-skill-cli.zip
chmod +x bin/agent-skill.mjs
AGENT_SKILL_MARKETPLACE_URL=http://localhost:3000 ./bin/agent-skill.mjs install agent-observer
AGENT_SKILL_MARKETPLACE_URL=http://localhost:3000 ./bin/agent-skill.mjs run agent-observer`}
          />
        </FirebenchHeroCard>

        <div className="fb-stage">
          <div className="fb-stage__label">
            <h2 className="fb-section-title" style={{ fontSize: "1rem" }}>
              Quick start
            </h2>
            <FirebenchTag>[ USAGE ]</FirebenchTag>
          </div>
          <div className="fb-stage__body">
            <FirebenchCode label="[ SHELL ]">{`./bin/agent-skill.mjs install <slug>
./bin/agent-skill.mjs run <slug>`}</FirebenchCode>
          </div>
        </div>
      </FirebenchPage>
    </AppShell>
  );
}
