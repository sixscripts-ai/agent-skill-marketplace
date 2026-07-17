"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { categories, compatibilityTargets, latestVersion, permissionKeys, permissionLabels } from "@/lib/data";
import type { CompatibilityTarget, Skill } from "@/lib/types";
import { MarketplaceHero } from "./marketplace-hero";
import { SkillCard } from "./skill-card";

const filterPills = ["All", "Popular", "New", "Top Rated", "Verified"];

export function MarketplaceClient({ initialQuery = "", skills }: { initialQuery?: string; skills: Skill[] }) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState("All");
  const [target, setTarget] = useState("All");
  const [permission, setPermission] = useState("All");
  const [trust, setTrust] = useState("All");
  const [pill, setPill] = useState("All");
  const [sort, setSort] = useState("runs");
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const filtered = useMemo(() => {
    const normalized = query.toLowerCase();
    const result = skills.filter((skill) => {
      const matchesQuery =
        !normalized ||
        skill.name.toLowerCase().includes(normalized) ||
        skill.summary.toLowerCase().includes(normalized) ||
        skill.author.toLowerCase().includes(normalized);
      const matchesCategory = category === "All" || skill.category === category;
      const matchesTarget =
        target === "All" ||
        skill.versions.some((version) => version.compatibilityTargets.includes(target as CompatibilityTarget));
      const matchesPermission = permission === "All" || skill.permissions.some((item) => item.key === permission);
      const matchesTrust = trust === "All" || skill.trustLevel === trust;
      const matchesPill =
        pill === "All" ||
        (pill === "Popular" && skill.installCount > 1000) ||
        (pill === "Top Rated" && skill.rating >= 4.8) ||
        (pill === "Verified" && skill.trustLevel === "Verified") ||
        (pill === "New" && skill.currentVersion.startsWith("v0."));
      return matchesQuery && matchesCategory && matchesTarget && matchesPermission && matchesTrust && matchesPill;
    });

    return [...result].sort((a, b) => {
      if (sort === "runs") {
        return b.installCount - a.installCount;
      } else if (sort === "rating") {
        return b.rating - a.rating;
      } else {
        const aDate = new Date(latestVersion(a).createdAt).getTime();
        const bDate = new Date(latestVersion(b).createdAt).getTime();
        return bDate - aDate;
      }
    });
  }, [category, permission, pill, query, target, trust, sort, skills]);


  function scrollToGrid() {
    gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="marketplace-cyber -mx-4 -my-6 px-4 py-6 sm:-mx-6 sm:px-6 lg:-mx-8 lg:-my-8 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-7xl">
        {/* ─── Hero ─── */}
        <MarketplaceHero onBrowseClick={scrollToGrid} />

        {/* ─── Stats Row ─── */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <CyberMetric icon="📦" value={skills.length} label="published skills" />
          <CyberMetric icon="🎯" value={compatibilityTargets.length} label="install targets" />
          <CyberMetric icon="📊" value="91%" label="average eval" />
          <CyberMetric icon="🔒" value="SSE" label="sandbox mode" />
        </div>

        {/* ─── Filters ─── */}
        <div className="cyber-card mt-6 p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              {filterPills.map((item) => (
                <button
                  key={item}
                  onClick={() => setPill(item)}
                  aria-pressed={pill === item}
                  data-testid={`marketplace-pill-${item.toLowerCase().replaceAll(" ", "-")}`}
                  className="cyber-pill px-3 py-2 text-sm font-medium"
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-[1.6fr_1fr_1fr_1fr_1fr_1fr]">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                data-testid="marketplace-search"
                aria-label="Search skills"
                placeholder="Search skills, authors, use cases"
                className="cyber-select h-11 px-3 text-sm placeholder:text-gray-500"
              />
              <CyberFilter label="Category" testId="marketplace-category" value={category} onChange={setCategory} values={["All", ...categories]} />
              <CyberFilter label="Compatibility" testId="marketplace-target" value={target} onChange={setTarget} values={["All", ...compatibilityTargets]} />
              <CyberFilter label="Permission" testId="marketplace-permission" value={permission} onChange={setPermission} values={["All", ...permissionKeys]} labels={permissionLabels} />
              <CyberFilter label="Trust Level" testId="marketplace-trust" value={trust} onChange={setTrust} values={["All", "Verified", "Reviewed", "Experimental"]} />
              <CyberFilter label="Sort By" testId="marketplace-sort" value={sort} onChange={setSort} values={["runs", "rating", "updated"]} labels={{ runs: "Sort by runs", rating: "Sort by rating", updated: "Sort by updated" }} />
            </div>
          </div>
        </div>

        {/* ─── Main Grid ─── */}
        <div ref={gridRef} className="mt-6 scroll-mt-20">
          <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4">
            {filtered.length ? (
              filtered.map((skill) => <SkillCard key={skill.slug} skill={skill} />)
            ) : (
              <div className="cyber-card flex min-h-[400px] flex-col items-center justify-center p-6 text-center sm:col-span-2 lg:col-span-3">
                <div className="mb-4 grid size-12 place-items-center rounded-full bg-white/5">
                  <span className="text-xl">🔍</span>
                </div>
                <h2 className="text-lg font-semibold text-white">No skills found</h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-gray-400">
                  We couldn&apos;t find any skills matching your filters. Try clearing your search or adjusting the criteria.
                </p>
                <button
                  onClick={() => {
                    setQuery("");
                    setCategory("All");
                    setTarget("All");
                    setPermission("All");
                    setTrust("All");
                    setPill("All");
                  }}
                  className="cyber-btn-secondary mt-6 inline-flex h-9 items-center px-4 text-sm"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

/* ─── Subcomponents ─── */

function CyberMetric({ icon, value, label }: { icon: string; value: string | number; label: string }) {
  return (
    <div className="cyber-card flex items-center gap-3 p-4">
      <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-white/5 text-lg">{icon}</div>
      <div>
        <div className="text-2xl font-semibold text-white">{value}</div>
        <div className="mt-0.5 text-xs uppercase tracking-[0.16em] text-gray-500">{label}</div>
      </div>
    </div>
  );
}

function CyberFilter({
  label,
  testId,
  value,
  onChange,
  values,
  labels,
}: {
  label: string;
  testId: string;
  value: string;
  onChange: (value: string) => void;
  values: string[];
  labels?: Record<string, string>;
}) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        data-testid={testId}
        className="cyber-select h-11 w-full px-3 text-sm"
      >
        {values.map((item) => (
          <option key={item} value={item}>{labels?.[item] ?? item}</option>
        ))}
      </select>
    </label>
  );
}

function CyberBadge({ tone = "green", children }: { tone?: "green" | "amber" | "red" | "blue" | "neutral"; children: React.ReactNode }) {
  const toneClass =
    tone === "green" ? "cyber-badge" :
    tone === "amber" ? "cyber-badge cyber-badge-amber" :
    tone === "red" ? "cyber-badge cyber-badge-red" :
    tone === "blue" ? "cyber-badge cyber-badge-blue" :
    "cyber-badge cyber-badge-neutral";
  return <span className={`${toneClass} inline-flex h-5 items-center px-2 py-0.5 text-xs`}>{children}</span>;
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="truncate font-semibold text-white">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.14em] text-gray-500">{label}</div>
    </div>
  );
}
