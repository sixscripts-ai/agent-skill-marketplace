import Link from "next/link";
import type { Skill } from "@/lib/types";

function trustTone(trust: Skill["trustLevel"]): "green" | "amber" | "blue" {
  if (trust === "Verified") return "green";
  if (trust === "Reviewed") return "blue";
  return "amber";
}

function badgeToneClass(tone: "green" | "amber" | "red" | "blue" | "neutral") {
  if (tone === "green") return "cyber-badge";
  if (tone === "amber") return "cyber-badge cyber-badge-amber";
  if (tone === "red") return "cyber-badge cyber-badge-red";
  if (tone === "blue") return "cyber-badge cyber-badge-blue";
  return "cyber-badge cyber-badge-neutral";
}

export function SkillCard({ skill }: { skill: Skill }) {
  const tone = trustTone(skill.trustLevel);

  return (
    <Link
      href={`/skills/${skill.slug}`}
      data-testid="skill-card"
      data-skill-slug={skill.slug}
      className="cyber-card group flex h-full flex-col p-5 transition duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-cyan-500/10 hover:ring-1 hover:ring-cyan-500/30"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-cyan-500/20 to-green-400/20 font-mono text-sm font-semibold text-cyan-400 ring-1 ring-white/10 group-hover:ring-cyan-400/50 transition-all">
            {skill.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h3 className="line-clamp-2 font-mono text-[15px] leading-tight font-semibold text-white group-hover:text-cyan-400 transition-colors">
              {skill.name}
            </h3>
            <p className="mt-1 truncate text-sm text-gray-500">{skill.author}</p>
          </div>
        </div>
        <span className={`${badgeToneClass(tone)} inline-flex h-5 shrink-0 items-center px-2 py-0.5 text-xs`}>
          {skill.trustLevel}
        </span>
      </div>
      
      <p className="mt-4 text-sm leading-6 text-gray-400 line-clamp-2" title={skill.summary}>
        {skill.summary}
      </p>
    </Link>
  );
}

