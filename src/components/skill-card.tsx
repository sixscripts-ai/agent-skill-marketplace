import Link from "next/link";
import type { Skill } from "@/lib/types";
import { permissionLabels } from "@/lib/data";

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

export function SkillCard({ skill, onSelect, isSelected }: { skill: Skill; onSelect?: (slug: string) => void; isSelected?: boolean }) {
  const latestScore = skill.evalSuites[0]?.results[0]?.score ?? 0;
  const tone = trustTone(skill.trustLevel);

  return (
    <div
      className={`cyber-card group flex h-full flex-col p-4 transition duration-150 ${isSelected ? "cyber-card-selected" : ""}`}
    >
      <div
        data-testid="skill-card"
        data-skill-slug={skill.slug}
        data-selected={isSelected ? "true" : undefined}
        className="flex h-full flex-col rounded-md outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1729]"
        role="button"
        tabIndex={0}
        onClick={() => onSelect?.(skill.slug)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect?.(skill.slug); } }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-cyan-500/20 to-green-400/20 font-mono text-sm font-semibold text-cyan-400 ring-1 ring-white/10">
              {skill.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <Link href={`/skills/${skill.slug}`} className="block truncate font-mono text-base font-semibold text-white group-hover:text-cyan-400 transition-colors">
                {skill.name}
              </Link>
              <p className="mt-0.5 truncate text-sm text-gray-500">{skill.author}</p>
            </div>
          </div>
          <span className={`${badgeToneClass(tone)} inline-flex h-5 shrink-0 items-center px-2 py-0.5 text-xs`}>
            {skill.trustLevel}
          </span>
        </div>
        
        <p className="mt-4 text-sm leading-6 text-gray-400 line-clamp-3" title={skill.summary}>
          {skill.summary}
        </p>
        
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="cyber-badge cyber-badge-neutral inline-flex h-5 items-center px-2 py-0.5 text-xs">{skill.category}</span>
          {skill.permissions.slice(0, 2).map((permission) => (
            <span key={permission.key} className="cyber-badge cyber-badge-neutral inline-flex h-5 items-center px-2 py-0.5 text-xs">
              {permissionLabels[permission.key] ?? permission.key}
            </span>
          ))}
        </div>

        <div className="mt-auto flex flex-col gap-4 pt-4">
          <div className="cyber-inset grid grid-cols-3 gap-3 px-3 py-3 text-[13px]">
            <div>
              <div className="font-semibold text-white">{skill.currentVersion}</div>
              <div className="text-xs text-gray-500">version</div>
            </div>
            <div>
              <div className="font-semibold text-white">{latestScore}%</div>
              <div className="text-xs text-gray-500">eval</div>
            </div>
            <div>
              <div className="font-semibold text-white">{skill.installCount.toLocaleString()}</div>
              <div className="text-xs text-gray-500">runs</div>
            </div>
          </div>
          <div className="flex gap-3">
            <Link
              href={`/skills/${skill.slug}/run`}
              data-testid="skill-card-run"
              className="cyber-btn-primary inline-flex h-8 flex-1 items-center justify-center px-3 text-sm"
            >
              Run
            </Link>
            <Link
              href={`/skills/${skill.slug}`}
              data-testid="skill-card-inspect"
              className="cyber-btn-secondary inline-flex h-8 flex-1 items-center justify-center px-3 text-sm"
            >
              Inspect
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
