"use client";

import { useMemo, useState } from "react";
import { categories, compatibilityTargets, permissionKeys } from "@/lib/data";
import type { CompatibilityTarget, Skill } from "@/lib/types";
import { SkillCard } from "./skill-card";
import { Badge, ButtonLink, Metric, Panel } from "./ui";

const filterPills = ["All", "Popular", "New", "Top Rated", "Verified"];

export function MarketplaceClient({ skills }: { skills: Skill[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [target, setTarget] = useState("All");
  const [permission, setPermission] = useState("All");
  const [trust, setTrust] = useState("All");
  const [pill, setPill] = useState("All");

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
  }, [category, permission, pill, query, target, trust, skills]);

  const selected = filtered[0] ?? skills[0];
  const topCategories = categories.slice(0, 5).map((item) => ({
    name: item,
    count: skills.filter((skill) => skill.category === item).length,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">Marketplace</h1>
          <p className="mt-2 text-sm leading-6 text-neutral-600">
            Discover, run, and install secure, reusable agent skills.
          </p>
        </div>
        <ButtonLink href="/builder">New Skill</ButtonLink>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Panel className="p-5"><Metric label="published skills" value={skills.length} /></Panel>
        <Panel className="p-5"><Metric label="install targets" value={compatibilityTargets.length} /></Panel>
        <Panel className="p-5"><Metric label="average eval" value="91%" /></Panel>
        <Panel className="p-5"><Metric label="sandbox mode" value="SSE" /></Panel>
      </div>

      <Panel className="p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {filterPills.map((item) => (
              <button
                key={item}
                onClick={() => setPill(item)}
                className={`rounded-md border px-3 py-2 text-sm font-medium transition ${
                  pill === item
                    ? "border-neutral-950 bg-neutral-950 text-white"
                    : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-[1.6fr_1fr_1fr_1fr_1fr]">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search skills, authors, use cases"
              className="h-11 rounded-md border px-3 text-sm outline-none"
            />
            <Filter label="Category" value={category} onChange={setCategory} values={["All", ...categories]} />
            <Filter label="Compatibility" value={target} onChange={setTarget} values={["All", ...compatibilityTargets]} />
            <Filter label="Permission" value={permission} onChange={setPermission} values={["All", ...permissionKeys]} />
            <Filter label="Sort" value={trust} onChange={setTrust} values={["All", "Verified", "Reviewed", "Experimental"]} />
          </div>
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <section className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {filtered.map((skill) => (
            <SkillCard key={skill.slug} skill={skill} />
          ))}
        </section>

        <aside className="flex flex-col gap-6">
          <Panel className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-neutral-500">Selected skill</div>
                <h2 className="mt-2 text-xl font-semibold text-neutral-950">{selected.name}</h2>
              </div>
              <Badge tone={selected.trustLevel === "Verified" ? "green" : "amber"}>{selected.trustLevel}</Badge>
            </div>
            <p className="mt-3 text-sm leading-6 text-neutral-600">{selected.summary}</p>
            <div className="mt-5 grid grid-cols-3 gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
              <MiniMetric label="rating" value={selected.rating.toFixed(1)} />
              <MiniMetric label="runs" value={selected.installCount.toLocaleString()} />
              <MiniMetric label="version" value={selected.currentVersion} />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {selected.permissions.map((permission) => (
                <Badge key={permission.key} tone={permission.risk === "high" ? "red" : permission.risk === "medium" ? "amber" : "neutral"}>
                  {permission.key}
                </Badge>
              ))}
            </div>
            <div className="mt-5 flex gap-3">
              <ButtonLink href={`/skills/${selected.slug}/run`}>Run Skill</ButtonLink>
              <ButtonLink href={`/install/${selected.slug}`} variant="secondary">Install</ButtonLink>
            </div>
            <div className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
              <div className="mb-3 flex gap-2">
                {["Claude", "Codex", "VS Code", "OpenCode"].map((item) => (
                  <Badge key={item}>{item}</Badge>
                ))}
              </div>
              <pre className="overflow-x-auto rounded-md border border-neutral-200 bg-white p-3 font-mono text-xs text-neutral-800">
                {`agent-skills install ${selected.slug}`}
              </pre>
              <div className="mt-3 flex gap-4 text-sm">
                <a className="font-medium text-neutral-950 underline" href={`/skills/${selected.slug}`}>View README</a>
                <a className="font-medium text-neutral-950 underline" href={`/skills/${selected.slug}/versions`}>All versions</a>
              </div>
            </div>
          </Panel>

          <Panel className="p-5">
            <h2 className="font-semibold text-neutral-950">Category trend</h2>
            <div className="mt-4 flex flex-col gap-3">
              {topCategories.map((item) => (
                <div key={item.name}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-700">{item.name}</span>
                    <span className="font-mono text-neutral-500">{item.count}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-neutral-100">
                    <div className="h-2 rounded-full bg-neutral-950" style={{ width: `${Math.max(12, item.count * 22)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  );
}

function Filter({
  label,
  value,
  onChange,
  values,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  values: string[];
}) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-md border px-3 text-sm text-neutral-700 outline-none"
      >
        {values.map((item) => (
          <option key={item}>{item}</option>
        ))}
      </select>
    </label>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="truncate font-semibold text-neutral-950">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.14em] text-neutral-500">{label}</div>
    </div>
  );
}
