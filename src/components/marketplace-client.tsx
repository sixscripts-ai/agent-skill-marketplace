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
  const [selectedSlug, setSelectedSlug] = useState("");
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (!selectedSlug && skills.length) {
      setSelectedSlug(skills[0].slug);
    }
  }, [selectedSlug, skills]);

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

  const selected = skills.find((s) => s.slug === selectedSlug) ?? skills[0];
  const topCategories = categories.slice(0, 5).map((item) => ({
    name: item,
    count: skills.filter((skill) => skill.category === item).length,
  }));

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

        {/* ─── Action Guide (collapsed) ─── */}
        <div ref={gridRef} className="mt-6 scroll-mt-20">
          <details className="cyber-card p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-white">What am I supposed to do?</h2>
              <span className="cyber-badge inline-flex items-center px-2 py-0.5 text-xs">quick start</span>
            </summary>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {[
                { label: "1", title: "Choose", body: "Search or filter until one skill looks relevant." },
                { label: "2", title: "Inspect", body: "Open the detail page if you need README, permissions, or versions." },
                { label: "3", title: "Run", body: "Use Run Skill to test it with a safe prompt before installing." },
                { label: "4", title: "Install", body: "Export the package only after the result and trace make sense." },
                { label: "5", title: "Build", body: "Use New Skill when you want to upload or author your own skill." },
              ].map((step) => (
                <div key={`${step.label}-${step.title}`} className="cyber-inset p-3">
                  <div className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-cyan-400">{step.label}</div>
                  <div className="mt-2 font-semibold text-white">{step.title}</div>
                  <p className="mt-1 text-sm leading-5 text-gray-400">{step.body}</p>
                </div>
              ))}
            </div>
          </details>
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

        {/* ─── Main Grid + Sidebar ─── */}
        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_380px]">
          <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.length ? (
              filtered.map((skill) => <SkillCard key={skill.slug} skill={skill} onSelect={setSelectedSlug} isSelected={skill.slug === selectedSlug} />)
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

          <aside className="flex flex-col gap-4">
            {/* Selected Skill Panel */}
            <div className="cyber-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-500">Selected skill</div>
                  <h2 className="mt-2 font-mono text-xl font-semibold text-white">{selected.name}</h2>
                </div>
                <CyberBadge tone={selected.trustLevel === "Verified" ? "green" : "amber"}>{selected.trustLevel}</CyberBadge>
              </div>
              <p className="mt-3 text-sm leading-6 text-gray-400">{selected.summary}</p>
              <p className="cyber-inset mt-3 p-3 text-sm leading-6 text-gray-400">
                Selected skill preview. Use this panel to decide whether to run, inspect, or install the first matching result.
              </p>
              <div className="cyber-inset mt-4 grid grid-cols-3 gap-3 p-3">
                <MiniMetric label="rating" value={selected.rating.toFixed(1)} />
                <MiniMetric label="runs" value={selected.installCount.toLocaleString()} />
                <MiniMetric label="version" value={selected.currentVersion} />
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {selected.permissions.map((perm) => (
                  <CyberBadge key={perm.key} tone={perm.risk === "high" ? "red" : perm.risk === "medium" ? "amber" : "neutral"}>
                    {perm.key}
                  </CyberBadge>
                ))}
              </div>
              <div className="mt-5 flex gap-3">
                <Link href={`/skills/${selected.slug}/run`} className="cyber-btn-primary inline-flex h-8 items-center px-4 text-sm">
                  Run Skill
                </Link>
                <Link href={`/install/${selected.slug}`} className="cyber-btn-secondary inline-flex h-8 items-center px-4 text-sm">
                  Install
                </Link>
              </div>
              <div className="cyber-inset mt-4 p-4">
                <div className="mb-3 flex gap-2">
                  {["Claude", "Codex", "VS Code", "OpenCode"].map((item) => (
                    <span key={item} className="cyber-badge-neutral cyber-badge inline-flex items-center px-2 py-0.5">{item}</span>
                  ))}
                </div>
                <pre className="cyber-code overflow-x-auto p-3 font-mono text-xs">
                  {`agent-skills install ${selected.slug}`}
                </pre>
                <div className="mt-3 flex gap-4 text-sm">
                  <Link className="font-medium text-cyan-400 underline underline-offset-4 hover:text-cyan-300" href={`/skills/${selected.slug}`}>View README</Link>
                  <Link className="font-medium text-cyan-400 underline underline-offset-4 hover:text-cyan-300" href={`/skills/${selected.slug}/versions`}>All versions</Link>
                </div>
              </div>
            </div>

            {/* Category Trend Panel */}
            <div className="cyber-card p-4">
              <h2 className="font-semibold text-white">Category trend</h2>
              <div className="mt-4 flex flex-col gap-3">
                {topCategories.map((item) => (
                  <div key={item.name}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">{item.name}</span>
                      <span className="font-mono text-gray-500">{item.count}</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-white/5">
                      <div className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-green-400" style={{ width: `${Math.max(12, item.count * 22)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
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
