"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Pencil, Play, Plus, Search } from "lucide-react";
import { latestVersion } from "@/lib/data";
import type { Skill, SkillLifecycleStatus } from "@/lib/types";
import "@/app/my-skills-console.css";

type StatusFilter = "all" | SkillLifecycleStatus;
type SortKey = "updated" | "runs" | "rating";

function lifecycleOf(skill: Skill): SkillLifecycleStatus {
  if (skill.status === "draft" || skill.status === "review" || skill.status === "released" || skill.status === "deprecated") {
    return skill.status;
  }
  return skill.visibility === "private" ? "draft" : "released";
}

function lifecycleLabel(status: SkillLifecycleStatus) {
  if (status === "review") return "in review";
  return status;
}

export function MySkillsClient({ skills }: { skills: Skill[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortKey>("updated");

  const counts = useMemo(() => {
    const byStatus = {
      draft: 0,
      review: 0,
      released: 0,
      deprecated: 0,
    };
    for (const skill of skills) byStatus[lifecycleOf(skill)] += 1;
    return {
      total: skills.length,
      ...byStatus,
      runs: skills.reduce((sum, skill) => sum + skill.installCount, 0),
    };
  }, [skills]);

  const rows = useMemo(() => {
    let result = skills;
    if (query) {
      const needle = query.toLowerCase();
      result = result.filter(
        (skill) =>
          skill.name.toLowerCase().includes(needle) ||
          skill.category.toLowerCase().includes(needle) ||
          skill.slug.toLowerCase().includes(needle),
      );
    }
    if (status !== "all") result = result.filter((skill) => lifecycleOf(skill) === status);

    return [...result].sort((a, b) => {
      if (sort === "runs") return b.installCount - a.installCount;
      if (sort === "rating") return b.rating - a.rating;
      return (
        new Date(latestVersion(b).createdAt).getTime() -
        new Date(latestVersion(a).createdAt).getTime()
      );
    });
  }, [skills, query, status, sort]);

  return (
    <div className="ms-console">
      <header className="ms-console__bar">
        <div className="ms-console__title">
          <h1>$ projects</h1>
          <p>Owner library — lifecycle separate from visibility. Edit, run, or open a sandbox against a skill package.</p>
        </div>
        <div className="ms-console__actions">
          <Link href="/projects/new" className="ms-btn ms-btn--primary">
            <Plus className="size-3.5" aria-hidden="true" />
            New project
          </Link>
        </div>
      </header>

      <div className="ms-console__meta" aria-label="Library stats">
        <span>
          projects <strong>{counts.total}</strong>
        </span>
        <span>
          draft <strong>{counts.draft}</strong>
        </span>
        <span>
          review <strong>{counts.review}</strong>
        </span>
        <span>
          released <strong>{counts.released}</strong>
        </span>
        <span>
          runs <strong>{counts.runs.toLocaleString()}</strong>
        </span>
      </div>

      <div className="ms-console__toolbar">
        <div className="ms-tabs" role="tablist" aria-label="Lifecycle">
          {(
            [
              ["all", "All"],
              ["draft", "Draft"],
              ["review", "In review"],
              ["released", "Released"],
              ["deprecated", "Deprecated"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className="ms-tab"
              data-active={status === id}
              onClick={() => setStatus(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="ms-console__search">
          <Search className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="sr-only">Search projects</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="rg: name | slug | category"
          />
        </label>
        <select
          value={sort}
          onChange={(event) => setSort(event.target.value as SortKey)}
          aria-label="Sort"
        >
          <option value="updated">sort:updated</option>
          <option value="runs">sort:runs</option>
          <option value="rating">sort:rating</option>
        </select>
      </div>

      <div className="ms-table" role="table" aria-label="Projects">
        <div className="ms-table__head" role="row">
          <span>Project</span>
          <span>Version</span>
          <span>Lifecycle</span>
          <span>Visibility</span>
          <span>Updated</span>
          <span>Actions</span>
        </div>

        {rows.length === 0 ? (
          <div className="ms-empty">
            No matches. Clear filters or{" "}
            <Link href="/projects/new" className="text-[var(--ms-heat)] underline-offset-2 hover:underline">
              create a project
            </Link>
            .
          </div>
        ) : (
          rows.map((skill) => {
            const version = latestVersion(skill);
            const lifecycle = lifecycleOf(skill);
            const visibility = skill.visibility ?? "public";
            return (
              <div key={skill.slug} className="ms-table__row" role="row">
                <div className="ms-skill">
                  <span className="ms-skill__mark" aria-hidden="true">
                    {skill.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <Link href={`/skills/${skill.slug}`} className="ms-skill__name">
                      {skill.slug}
                    </Link>
                    <p className="ms-skill__sub">
                      {skill.name} · {skill.category}
                    </p>
                  </div>
                </div>
                <span className="ms-mono">{skill.currentVersion}</span>
                <span className={`ms-badge ${lifecycle === "released" ? "ms-badge--live" : "ms-badge--draft"}`}>
                  {lifecycleLabel(lifecycle)}
                </span>
                <span className="ms-mono">{visibility}</span>
                <span className="ms-mono">{version.createdAt}</span>
                <div className="ms-row-actions">
                  <Link
                    href={`/skills/${skill.slug}?stage=sandbox&mode=autopilot`}
                    className="ms-btn ms-btn--primary"
                    style={{ minHeight: "1.9rem", fontSize: "0.72rem" }}
                  >
                    <Play className="size-3" aria-hidden="true" />
                    Run
                  </Link>
                  <Link
                    href={`/projects/${skill.slug}`}
                    className="ms-btn ms-btn--ghost"
                    style={{ minHeight: "1.9rem", fontSize: "0.72rem" }}
                  >
                    <Pencil className="size-3" aria-hidden="true" />
                    Edit
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
