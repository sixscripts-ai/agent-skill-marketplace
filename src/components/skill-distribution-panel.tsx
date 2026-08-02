import { CodeBlock } from "@/components/code-block";
import { Badge, ButtonLink, Panel } from "@/components/ui";
import type { Skill, SkillVersion } from "@/lib/types";

export function SkillDistributionPanel({ skill, version }: { skill: Skill; version: SkillVersion }) {
  return (
    <div className="flex flex-col gap-5" data-testid="skill-distribution">
      <Panel className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-neutral-950">Distribution</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              Export platform-specific instructions, config snippets, and a package manifest.
            </p>
          </div>
          <ButtonLink href={`/api/packages/${skill.slug}`} variant="secondary">
            Download package
          </ButtonLink>
        </div>
      </Panel>
      <section className="grid gap-4 lg:grid-cols-2">
        {skill.installTargets.map((target) => (
          <Panel key={target.platform} className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold text-neutral-950">{target.platform}</h3>
              <Badge>{target.packageFormat}</Badge>
            </div>
            <p className="mt-3 text-sm leading-6 text-neutral-600">{target.notes}</p>
            <h4 className="mt-5 text-sm font-semibold text-neutral-950">Install command</h4>
            <div className="mt-2">
              <CodeBlock code={target.installCommand} />
            </div>
            <h4 className="mt-5 text-sm font-semibold text-neutral-950">Config snippet</h4>
            <div className="mt-2">
              <CodeBlock code={target.configSnippet} />
            </div>
          </Panel>
        ))}
      </section>
      <Panel className="p-5">
        <h3 className="font-semibold text-neutral-950">Package manifest</h3>
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
                files: ["SKILL.md", "README.md", "skill.json", "examples/sample-inputs.json"],
              },
              null,
              2,
            )}
          />
        </div>
      </Panel>
    </div>
  );
}
