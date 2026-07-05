"use client";

import { useMemo, useState } from "react";
import { categories, compatibilityTargets, permissionKeys } from "@/lib/data";
import type { CompatibilityTarget } from "@/lib/types";
import type { Skill } from "@/lib/types";
import { SkillCard } from "./skill-card";
import { Badge, Metric, Panel } from "./ui";

export function MarketplaceClient({ skills }: { skills: Skill[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [target, setTarget] = useState("All");
  const [permission, setPermission] = useState("All");
  const [trust, setTrust] = useState("All");

  const filtered = useMemo(() => {
    const normalized = query.toLowerCase();
    return skills.filter((skill) => {
      const matchesQuery =
        !normalized ||
        skill.name.toLowerCase().includes(normalized) ||
        skill.summary.toLowerCase().includes(normalized) ||
        skill.author.toLowerCase().includes(normalized);
      const matchesCategory = category === "All" || skill.category === category;
      const matchesTarget =
        target === "All" ||
        skill.versions.some((version) => version.compatibilityTargets.includes(target as CompatibilityTarget));
      const matchesPermission =
        permission === "All" || skill.permissions.some((item) => item.key === permission);
      const matchesTrust = trust === "All" || skill.trustLevel === trust;
      return matchesQuery && matchesCategory && matchesTarget && matchesPermission && matchesTrust;
    });
  }, [category, permission, query, target, trust]);

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Panel className="p-6" variant="floating">
          <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Run, audit, version, and export portable agent skills.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
            A marketplace for SKILL.md packages with browser execution, permission simulation,
            regression evals, trace replay, and install targets for modern AI coding tools.
          </p>
          <div className="mt-8 grid max-w-2xl grid-cols-2 gap-5 sm:grid-cols-4">
            <Metric label="skills" value={skills.length} />
            <Metric label="targets" value={compatibilityTargets.length} />
            <Metric label="eval avg" value="91%" />
            <Metric label="live runs" value="SSE" />
          </div>
        </Panel>
        <Panel className="p-5" variant="floating">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h2 className="font-semibold text-white">Live sandbox preview</h2>
              <p className="mt-1 text-sm text-slate-500">Deterministic runner, no API key required.</p>
            </div>
            <Badge tone="green">safe mode</Badge>
          </div>
          <div className="mt-5 space-y-3">
            {["permission: read_files approved", "tool: run_eval complete", "warning: shell action blocked", "artifact: manifest generated"].map(
              (item, index) => (
                <div key={item} className="glass-subtle flex items-center gap-3 rounded-xl p-3">
                  <span className="grid h-7 w-7 place-items-center rounded bg-cyan-300/10 font-mono text-xs text-cyan-200">
                    {index + 1}
                  </span>
                  <span className="text-sm text-slate-300">{item}</span>
                </div>
              ),
            )}
          </div>
        </Panel>
      </section>

      <Panel className="p-4" variant="toolbar">
        <div className="grid gap-3 md:grid-cols-[1.6fr_1fr_1fr_1fr_1fr]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search skills, authors, use cases"
            className="h-11 rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/60"
          />
          <Filter value={category} onChange={setCategory} values={["All", ...categories]} />
          <Filter value={target} onChange={setTarget} values={["All", ...compatibilityTargets]} />
          <Filter value={permission} onChange={setPermission} values={["All", ...permissionKeys]} />
          <Filter value={trust} onChange={setTrust} values={["All", "Verified", "Reviewed", "Experimental"]} />
        </div>
      </Panel>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((skill) => (
          <SkillCard key={skill.slug} skill={skill} />
        ))}
      </section>
    </div>
  );
}

function Filter({
  value,
  onChange,
  values,
}: {
  value: string;
  onChange: (value: string) => void;
  values: string[];
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-11 rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-slate-200 outline-none transition focus:border-cyan-300/60"
    >
      {values.map((item) => (
        <option key={item}>{item}</option>
      ))}
    </select>
  );
}
