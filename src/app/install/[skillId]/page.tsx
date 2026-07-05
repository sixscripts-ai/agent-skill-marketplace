import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CodeBlock } from "@/components/code-block";
import { Badge, ButtonLink, Panel } from "@/components/ui";
import { latestVersion } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import { findSkill } from "@/lib/repository";

export default async function InstallPage({ params }: { params: Promise<{ skillId: string }> }) {
  const { skillId } = await params;
  const skill = await findSkill(skillId, await getCurrentUser());
  if (!skill) notFound();
  const version = latestVersion(skill);

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <Panel className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold text-neutral-950">Install {skill.name}</h1>
              <p className="mt-3 text-sm leading-6 text-neutral-600">
                Export platform-specific instructions, config snippets, and a mock package manifest.
              </p>
            </div>
            <ButtonLink href={`/api/packages/${skill.slug}`} variant="secondary">Download package</ButtonLink>
          </div>
        </Panel>
        <section className="grid gap-5 lg:grid-cols-2">
          {skill.installTargets.map((target) => (
            <Panel key={target.platform} className="p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold text-neutral-950">{target.platform}</h2>
                <Badge>{target.packageFormat}</Badge>
              </div>
              <p className="mt-3 text-sm leading-6 text-neutral-600">{target.notes}</p>
              <h3 className="mt-5 text-sm font-semibold text-neutral-950">Install command</h3>
              <div className="mt-2">
                <CodeBlock code={target.installCommand} />
              </div>
              <h3 className="mt-5 text-sm font-semibold text-neutral-950">Config snippet</h3>
              <div className="mt-2">
                <CodeBlock code={target.configSnippet} />
              </div>
            </Panel>
          ))}
        </section>
        <Panel className="p-5">
          <h2 className="font-semibold text-neutral-950">Package manifest</h2>
          <div className="mt-3">
            <CodeBlock
              code={JSON.stringify(
                {
                  name: skill.name,
                  slug: skill.slug,
                  version: version.version,
                  entry: "SKILL.md",
                  permissions: skill.permissions.map((permission) => permission.key),
                  compatibility: version.compatibilityTargets,
                  files: ["SKILL.md", "README.md", "skill.json", "examples/demo-inputs.json"],
                },
                null,
                2,
              )}
            />
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
