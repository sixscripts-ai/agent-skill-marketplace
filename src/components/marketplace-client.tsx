"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SearchX } from "lucide-react";
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

  useEffect(() => { setQuery(initialQuery); }, [initialQuery]);

  const filtered = useMemo(() => {
    const normalized = query.toLowerCase();
    const result = skills.filter((skill) => {
      const matchesQuery = !normalized || skill.name.toLowerCase().includes(normalized) || skill.summary.toLowerCase().includes(normalized) || skill.author.toLowerCase().includes(normalized);
      const matchesCategory = category === "All" || skill.category === category;
      const matchesTarget = target === "All" || skill.versions.some((version) => version.compatibilityTargets.includes(target as CompatibilityTarget));
      const matchesPermission = permission === "All" || skill.permissions.some((item) => item.key === permission);
      const matchesTrust = trust === "All" || skill.trustLevel === trust;
      const matchesPill = pill === "All" ||
        (pill === "Popular" && skill.installCount > 1000) ||
        (pill === "Top Rated" && skill.rating >= 4.8) ||
        (pill === "Verified" && skill.trustLevel === "Verified") ||
        (pill === "New" && skill.currentVersion.startsWith("v0."));
      return matchesQuery && matchesCategory && matchesTarget && matchesPermission && matchesTrust && matchesPill;
    });

    return [...result].sort((a, b) => {
      if (sort === "runs") return b.installCount - a.installCount;
      if (sort === "rating") return b.rating - a.rating;
      return new Date(latestVersion(b).createdAt).getTime() - new Date(latestVersion(a).createdAt).getTime();
    });
  }, [category, permission, pill, query, target, trust, sort, skills]);

  function resetFilters() {
    setQuery(""); setCategory("All"); setTarget("All"); setPermission("All"); setTrust("All"); setPill("All"); setSort("runs");
  }

  return (
    <div className="marketplace-v2 -mx-4 -my-6 px-4 py-6 sm:-mx-6 sm:px-6 lg:-mx-8 lg:-my-8 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-7xl">
        <MarketplaceHero onBrowseClick={() => gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })} />

        <div className="discovery-rail-v2">
          <div className="discovery-row-v2" aria-label="Marketplace filters">
            <input value={query} onChange={(event) => setQuery(event.target.value)} data-testid="marketplace-search" aria-label="Search skills" placeholder="Search skills, authors, use cases" className="discovery-search-v2 placeholder:text-muted-foreground" />
            {filterPills.map((item) => (
              <button key={item} onClick={() => setPill(item)} aria-pressed={pill === item} data-testid={`marketplace-pill-${item.toLowerCase().replaceAll(" ", "-")}`} className="discovery-control-v2 discovery-pill-v2 font-medium">
                {item}
              </button>
            ))}
            <Filter label="Category" testId="marketplace-category" value={category} onChange={setCategory} values={["All", ...categories]} />
            <Filter label="Compatibility" testId="marketplace-target" value={target} onChange={setTarget} values={["All", ...compatibilityTargets]} />
            <Filter label="Permission" testId="marketplace-permission" value={permission} onChange={setPermission} values={["All", ...permissionKeys]} labels={permissionLabels} />
            <Filter label="Trust Level" testId="marketplace-trust" value={trust} onChange={setTrust} values={["All", "Verified", "Reviewed", "Experimental"]} />
            <Filter label="Sort By" testId="marketplace-sort" value={sort} onChange={setSort} values={["runs", "rating", "updated"]} labels={{ runs: "Sort by runs", rating: "Sort by rating", updated: "Sort by updated" }} />
          </div>
        </div>

        <div ref={gridRef} className="mt-6 scroll-mt-24">
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {filtered.length ? filtered.map((skill) => <SkillCard key={skill.slug} skill={skill} />) : (
              <div className="skill-card-v2 flex min-h-[360px] flex-col items-center justify-center p-8 text-center sm:col-span-2 lg:col-span-3 2xl:col-span-4">
                <div className="mb-4 grid size-12 place-items-center rounded-md border border-border bg-muted text-muted-foreground"><SearchX className="size-5" /></div>
                <h2 className="text-lg font-semibold text-foreground">No skills found</h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">No skills match the current search and filter combination.</p>
                <button onClick={resetFilters} className="mt-6 inline-flex h-9 items-center rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground hover:bg-muted">Clear all filters</button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Filter({ label, testId, value, onChange, values, labels }: { label: string; testId: string; value: string; onChange: (value: string) => void; values: string[]; labels?: Record<string, string> }) {
  return <label className="shrink-0"><span className="sr-only">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} data-testid={testId} className="discovery-control-v2 min-w-[9.25rem]">{values.map((item) => <option key={item} value={item}>{labels?.[item] ?? item}</option>)}</select></label>;
}
