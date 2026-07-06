"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Badge, ButtonLink, Panel } from "@/components/ui";
import { latestVersion } from "@/lib/data";
import type { Skill } from "@/lib/types";

export function MySkillsClient({ skills }: { skills: Skill[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("updated");

  const filteredAndSorted = useMemo(() => {
    let result = skills;
    
    // Search
    if (query) {
      const q = query.toLowerCase();
      result = result.filter(s => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q));
    }
    
    // Filter by status
    if (status !== "all") {
      if (status === "published") {
        result = result.filter(s => s.visibility !== "private");
      } else if (status === "draft") {
        result = result.filter(s => s.visibility === "private");
      }
    }
    
    // Sort
    result = [...result].sort((a, b) => {
      if (sort === "runs") {
        return b.installCount - a.installCount;
      } else if (sort === "rating") {
        return b.rating - a.rating;
      } else {
        // updated
        const aDate = new Date(latestVersion(a).createdAt).getTime();
        const bDate = new Date(latestVersion(b).createdAt).getTime();
        return bDate - aDate;
      }
    });
    
    return result;
  }, [skills, query, status, sort]);

  return (
    <>
      <Panel className="p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_180px_160px]">
          <input 
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="h-10 rounded-md border border-neutral-300 px-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand" 
            placeholder="Search my skills" 
          />
          <select 
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="h-10 rounded-md border border-neutral-300 px-3 text-sm text-neutral-700 outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          >
            <option value="all">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
          <select 
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="h-10 rounded-md border border-neutral-300 px-3 text-sm text-neutral-700 outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          >
            <option value="updated">Sort by updated</option>
            <option value="runs">Sort by runs</option>
            <option value="rating">Sort by rating</option>
          </select>
          <ButtonLink href="/marketplace" variant="secondary">Marketplace</ButtonLink>
        </div>
      </Panel>

      <Panel className="overflow-hidden">
        <div className="border-b border-neutral-200 px-5 py-4">
          <h2 className="font-semibold text-neutral-950">Skill inventory</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-[0.14em] text-neutral-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Skill</th>
                <th className="px-5 py-3 font-semibold">Version</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Runs</th>
                <th className="px-5 py-3 font-semibold">Updated</th>
                <th className="px-5 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {filteredAndSorted.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-neutral-500">
                    No skills match your filters.
                  </td>
                </tr>
              ) : (
                filteredAndSorted.map((skill) => {
                  const version = latestVersion(skill);
                  const skillStatus = skill.visibility === "private" ? "Draft" : "Published";
                  return (
                    <tr key={skill.slug} className="bg-white transition hover:bg-neutral-50">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="grid size-9 place-items-center rounded-md border border-neutral-200 bg-neutral-100 font-mono text-xs font-semibold text-neutral-950">
                            {skill.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <Link href={`/skills/${skill.slug}`} className="font-semibold text-neutral-950 underline-offset-4 hover:underline">
                              {skill.name}
                            </Link>
                            <div className="mt-1 text-xs text-neutral-500">{skill.category}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-neutral-700">{skill.currentVersion}</td>
                      <td className="px-5 py-4">
                        <Badge tone={skillStatus === "Published" ? "green" : "neutral"}>{skillStatus}</Badge>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-neutral-700">{skill.installCount.toLocaleString()}</td>
                      <td className="px-5 py-4 text-neutral-600">{version.createdAt}</td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <Link className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-900 hover:bg-neutral-100" href={`/builder/${skill.slug}`}>
                            Edit
                          </Link>
                          <Link className="rounded-md border border-neutral-950 bg-neutral-950 px-3 py-2 text-xs font-semibold text-white hover:bg-neutral-800" href={`/skills/${skill.slug}/run`}>
                            Run
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
