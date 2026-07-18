import Link from "next/link";
import { Download, Star } from "lucide-react";
import type { Skill } from "@/lib/types";

function trustToneClass(trust: Skill["trustLevel"]) {
  if (trust === "Verified") return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300";
  if (trust === "Reviewed") return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-300";
  return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300";
}

export function SkillCard({ skill }: { skill: Skill }) {
  return (
    <Link href={`/skills/${skill.slug}`} data-testid="skill-card" data-skill-slug={skill.slug} className="skill-card-v2 group flex h-full flex-col p-5">
      <div className="flex items-start gap-3">
        <div className="skill-icon-v2 grid size-10 shrink-0 place-items-center font-mono text-sm font-semibold">
          {skill.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-[15px] font-semibold leading-tight text-foreground transition-colors group-hover:text-brand">{skill.name}</h3>
          <p className="mt-1 truncate text-sm text-muted-foreground">{skill.author} &middot; {skill.category}</p>
        </div>
      </div>

      <p className="mt-4 line-clamp-3 flex-1 text-sm leading-6 text-muted-foreground" title={skill.summary}>{skill.summary}</p>

      <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
        <div className="flex items-center gap-3 font-mono text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Download className="size-3.5" aria-hidden="true" />{(skill.installCount || 0).toLocaleString()}</span>
          <span className="flex items-center gap-1"><Star className="size-3.5 text-amber-500" aria-hidden="true" />{(skill.rating || 0).toFixed(1)}</span>
        </div>
        <span className={`inline-flex h-6 items-center rounded-md border px-2 text-xs font-medium ${trustToneClass(skill.trustLevel)}`}>{skill.trustLevel}</span>
      </div>
    </Link>
  );
}
