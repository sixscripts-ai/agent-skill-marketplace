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
    <Panel className="group flex min-h-[310px] flex-col p-5 transition hover:border-cyan-200/35 hover:bg-white/[0.085]" variant="floating">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href={`/skills/${skill.slug}`} className="text-lg font-semibold text-white group-hover:text-cyan-200">
            {skill.name}
          </Link>
          <p className="mt-1 text-sm text-slate-500">{skill.category}</p>
        </div>
        <Badge tone={trustTone(skill.trustLevel)}>{skill.trustLevel}</Badge>
      </div>
      <p className="mt-4 flex-1 text-sm leading-6 text-slate-300">{skill.summary}</p>
      <div className="glass-subtle mt-5 grid grid-cols-3 gap-3 rounded-xl px-3 py-4 text-sm">
        <div>
          <div className="font-semibold text-white">{skill.currentVersion}</div>
          <div className="text-xs text-slate-500">version</div>
        </div>
        <div>
          <div className="font-semibold text-white">{latestScore}%</div>
          <div className="text-xs text-slate-500">eval</div>
        </div>
        <div>
          <div className="font-semibold text-white">{skill.installCount.toLocaleString()}</div>
          <div className="text-xs text-slate-500">installs</div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {skill.permissions.slice(0, 3).map((permission) => (
          <Badge key={permission.key}>{permission.key}</Badge>
        ))}
      </div>
      <div className="mt-5 flex gap-3">
        <ButtonLink href={`/skills/${skill.slug}`}>Inspect</ButtonLink>
        <ButtonLink href={`/skills/${skill.slug}/run`} variant="secondary">
          Try skill
        </ButtonLink>
      </div>
    </Panel>
  );
}
