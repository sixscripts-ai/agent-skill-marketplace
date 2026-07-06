import Link from "next/link";
import type { Skill } from "@/lib/types";
import { permissionLabels } from "@/lib/data";
import { Badge, ButtonLink, Panel } from "./ui";

function trustTone(trust: Skill["trustLevel"]) {
  if (trust === "Verified") return "green" as const;
  if (trust === "Reviewed") return "blue" as const;
  return "amber" as const;
}

export function SkillCard({ skill, onSelect, isSelected }: { skill: Skill; onSelect?: (slug: string) => void; isSelected?: boolean }) {
  const latestScore = skill.evalSuites[0]?.results[0]?.score ?? 0;

  return (
    <Panel
      className={`group flex h-full flex-col p-4 transition duration-150 hover:border-border-strong ${isSelected ? "border-brand" : ""}`}
    >
      <div
        data-testid="skill-card"
        data-skill-slug={skill.slug}
        data-selected={isSelected ? "true" : undefined}
        className="flex h-full flex-col rounded-md outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        role="button"
        tabIndex={0}
        onClick={() => onSelect?.(skill.slug)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect?.(skill.slug); } }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-md border border-brand-border bg-brand-soft font-mono text-sm font-semibold text-brand">
              {skill.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <Link href={`/skills/${skill.slug}`} className="block truncate text-base font-semibold text-neutral-950 group-hover:underline">
                {skill.name}
              </Link>
              <p className="mt-0.5 truncate text-sm text-neutral-500">{skill.author}</p>
            </div>
          </div>
          <Badge tone={trustTone(skill.trustLevel)} className="shrink-0">{skill.trustLevel}</Badge>
        </div>
        
        <p className="mt-4 text-sm leading-6 text-neutral-600 line-clamp-3" title={skill.summary}>
          {skill.summary}
        </p>
        
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge>{skill.category}</Badge>
          {skill.permissions.slice(0, 2).map((permission) => (
            <Badge key={permission.key}>{permissionLabels[permission.key] ?? permission.key}</Badge>
          ))}
        </div>

        <div className="mt-auto flex flex-col gap-4 pt-4">
          <div className="grid grid-cols-3 gap-3 rounded-md border border-border bg-heat-4 px-3 py-3 text-[13px]">
            <div>
              <div className="font-semibold text-neutral-950">{skill.currentVersion}</div>
              <div className="text-xs text-neutral-500">version</div>
            </div>
            <div>
              <div className="font-semibold text-neutral-950">{latestScore}%</div>
              <div className="text-xs text-neutral-500">eval</div>
            </div>
            <div>
              <div className="font-semibold text-neutral-950">{skill.installCount.toLocaleString()}</div>
              <div className="text-xs text-neutral-500">runs</div>
            </div>
          </div>
          <div className="flex gap-3">
            <ButtonLink href={`/skills/${skill.slug}/run`} testId="skill-card-run">Run</ButtonLink>
            <ButtonLink href={`/skills/${skill.slug}`} testId="skill-card-inspect" variant="secondary">
              Inspect
            </ButtonLink>
          </div>
        </div>
      </div>
    </Panel>
  );
}
