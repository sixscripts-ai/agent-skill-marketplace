"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Pencil, Play, Plus, Search } from "lucide-react";
import { latestVersion } from "@/lib/data";
import type { Skill } from "@/lib/types";
import "@/app/my-skills-console.css";

type StatusFilter = "all" | "published" | "draft";
type SortKey = "updated" | "runs" | "rating";

export function MySkillsClient({ skills }: { skills: Skill[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortKey>("updated");

  const counts = useMemo(() => {
    const published = skills.filter((skill) => skill.visibility !== "private").length;
    const draft = skills.length - published;
    return {
      total: skills.length,
      published,
      draft,
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
    if (status === "published") result = result.filter((skill) => skill.visibility !== "private");
    if (status === "draft") result = result.filter((skill) => skill.visibility === "private");

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
          <h1>$ my-skills</h1>
          <p>Dev library — edit, run, or open a live sandbox session against a skill package.</p>
        </div>
        <div className="ms-console__actions">
          <Link href="/builder" className="ms-btn ms-btn--primary">
            <Plus className="size-3.5" aria-hidden="true" />
            New skill
          </Link>
        </div>
      </header>

      <div className="ms-console__meta" aria-label="Library stats">
        <span>
          skills <strong>{counts.total}</strong>
        </span>
        <span>
          live <strong>{counts.published}</strong>
        </span>
        <span>
          draft <strong>{counts.draft}</strong>
        </span>
        <span>
          runs <strong>{counts.runs.toLocaleString()}</strong>
        </span>
      </div>

      <div className="ms-console__toolbar">
        <div className="ms-tabs" role="tablist" aria-label="Status">
          {(
            [
              ["all", "All"],
              ["published", "Live"],
              ["draft", "Draft"],
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
          <span className="sr-only">Search skills</span>
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

      <div className="ms-table" role="table" aria-label="Skill processes">
        <div className="ms-table__head" role="row">
          <span>Skill</span>
          <span>Version</span>
          <span>Status</span>
          <span>Runs</span>
          <span>Updated</span>
          <span>Actions</span>
        </div>

        {rows.length === 0 ? (
          <div className="ms-empty">
            No matches. Clear filters or{" "}
            <Link href="/builder" className="text-[var(--ms-heat)] underline-offset-2 hover:underline">
              create a skill
            </Link>
            .
          </div>
        ) : (
          rows.map((skill) => {
            const version = latestVersion(skill);
            const isDraft = skill.visibility === "private";
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
                <span className={`ms-badge ${isDraft ? "ms-badge--draft" : "ms-badge--live"}`}>
                  {isDraft ? "draft" : "live"}
                </span>
                <span className="ms-mono">{skill.installCount.toLocaleString()}</span>
                <span className="ms-mono">{version.createdAt}</span>
                <div className="ms-row-actions">
                  <Link
                    href={`/skills/${skill.slug}/run`}
                    className="ms-btn ms-btn--primary"
                    style={{ minHeight: "1.9rem", fontSize: "0.72rem" }}
                  >
                    <Play className="size-3" aria-hidden="true" />
                    Run
                  </Link>
                  <Link
                    href={`/builder/${skill.slug}`}
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
