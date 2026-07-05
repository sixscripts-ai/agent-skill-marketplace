import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Badge, ButtonLink, Panel } from "@/components/ui";
import { latestVersion } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import { listVisibleSkills } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function MySkillsPage() {
  const user = await getCurrentUser();
  const skills = await listVisibleSkills(user);

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-neutral-950">My Skills</h1>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              Manage published, draft, and remixable agent skills from one workspace.
            </p>
          </div>
          <ButtonLink href="/builder">New Skill</ButtonLink>
        </div>

        <Panel className="p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_180px_180px_160px]">
            <input className="h-10 rounded-md border px-3 text-sm outline-none" placeholder="Search my skills" />
            <select className="h-10 rounded-md border px-3 text-sm outline-none" defaultValue="all">
              <option value="all">All statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="deprecated">Deprecated</option>
            </select>
            <select className="h-10 rounded-md border px-3 text-sm outline-none" defaultValue="updated">
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
                {skills.map((skill) => {
                  const version = latestVersion(skill);
                  const status = skill.visibility === "private" ? "Draft" : "Published";
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
                        <Badge tone={status === "Published" ? "green" : "neutral"}>{status}</Badge>
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
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
