import Link from "next/link";
import type { Skill } from "@/lib/types";
import { Badge, ButtonLink, Panel } from "./ui";

function trustTone(trust: Skill["trustLevel"]) {
  if (trust === "Verified") return "green" as const;
  if (trust === "Reviewed") return "blue" as const;
  return "amber" as const;
}

export function SkillCard({ skill }: { skill: Skill }) {
  const latestScore = skill.evalSuites[0]?.results[0]?.score ?? 0;

  return (
    <Panel className="group flex min-h-[310px] flex-col p-5 transition duration-150 hover:border-neutral-400 hover:shadow-md" variant="floating">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-neutral-200 bg-neutral-100 font-mono text-sm font-semibold text-neutral-900">
            {skill.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
          <Link href={`/skills/${skill.slug}`} className="text-base font-semibold text-neutral-950 group-hover:underline">
            {skill.name}
          </Link>
          <p className="mt-1 text-sm text-neutral-500">{skill.author}</p>
          </div>
        </div>
        <Badge tone={trustTone(skill.trustLevel)}>{skill.trustLevel}</Badge>
      </div>
      <p className="mt-4 flex-1 text-sm leading-6 text-neutral-600">{skill.summary}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge>{skill.category}</Badge>
        {skill.permissions.slice(0, 2).map((permission) => (
          <Badge key={permission.key}>{permission.key}</Badge>
        ))}
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-4 text-sm">
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
      <div className="mt-5 flex gap-3">
        <ButtonLink href={`/skills/${skill.slug}/run`}>Run</ButtonLink>
        <ButtonLink href={`/skills/${skill.slug}`} variant="secondary">
          Inspect
        </ButtonLink>
      </div>
    </Panel>
  );
}
