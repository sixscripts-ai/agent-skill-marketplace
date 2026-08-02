import { CodeBlock } from "@/components/code-block";
import { Badge, Panel } from "@/components/ui";
import type { Skill } from "@/lib/types";

export function SkillVersionsPanel({ skill }: { skill: Skill }) {
  const [current, previous] = skill.versions;

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]" data-testid="skill-versions">
      <Panel className="p-5">
        <h2 className="font-semibold text-neutral-950">History</h2>
        <div className="mt-4 space-y-4">
          {skill.versions.map((version) => (
            <div key={version.version} className="rounded-md border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">{version.version}</span>
                {version.version === skill.currentVersion ? <Badge tone="green">current</Badge> : <Badge>rollback</Badge>}
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{version.changelog}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(Array.isArray(version.compatibilityTargets) ? version.compatibilityTargets : [])
                  .slice(0, 4)
                  .map((target) => (
                    <Badge key={target}>{target}</Badge>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </Panel>
      <Panel className="p-5">
        <h2 className="font-semibold text-neutral-950">SKILL.md diff</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Showing current {current?.version ?? "—"} against prior {previous?.version ?? "none"}.
        </p>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-medium text-foreground">{current?.version ?? "Current"}</h3>
            <CodeBlock code={current?.skillMd ?? ""} />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-medium text-foreground">{previous?.version ?? "No previous version"}</h3>
            <CodeBlock code={previous?.skillMd ?? "Initial release"} />
          </div>
        </div>
      </Panel>
    </div>
  );
}
