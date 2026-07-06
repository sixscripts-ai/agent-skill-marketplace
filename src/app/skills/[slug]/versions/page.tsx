import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CodeBlock } from "@/components/code-block";
import { Badge, Panel } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { findSkill } from "@/lib/repository";

export default async function VersionsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const skill = await findSkill(slug, await getCurrentUser());
  if (!skill) notFound();
  const [current, previous] = skill.versions;

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-950">{skill.name} Versions</h1>
          <p className="mt-2 text-sm leading-6 text-neutral-600">
            Versioned SKILL.md packages with compatibility tags, changelogs, and rollback-ready history.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
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
                    {version.compatibilityTargets.slice(0, 4).map((target) => (
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
              Showing current {current.version} against prior {previous?.version ?? "none"}.
            </p>
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-medium text-foreground">{current.version}</h3>
                <CodeBlock code={current.skillMd} />
              </div>
              <div>
                <h3 className="mb-2 text-sm font-medium text-foreground">{previous?.version ?? "No previous version"}</h3>
                <CodeBlock code={previous?.skillMd ?? "Initial release"} />
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
