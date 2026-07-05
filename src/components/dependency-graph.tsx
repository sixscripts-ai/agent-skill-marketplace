import { buildSkillGraph } from "@/lib/dependency-graph";
import type { Skill } from "@/lib/types";
import { Badge, Panel } from "./ui";

export function DependencyGraph({ skill }: { skill: Skill }) {
  const graph = buildSkillGraph(skill);
  const groups = [
    "skill",
    "version",
    "permission",
    "tool",
    "provider",
    "file",
    "artifact",
    "target",
    "suite",
    "eval-case",
  ] as const;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <Panel className="p-6" variant="floating">
        <h1 className="text-3xl font-semibold text-white">{skill.name} Dependency Graph</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Map how this skill depends on versions, permissions, virtual tools, providers, workspace files, artifacts, install targets, and evals.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {groups.map((group) => {
            const count = graph.nodes.filter((node) => node.type === group).length;
            return (
              <div key={group} className="glass-subtle rounded-xl p-3">
                <div className="text-lg font-semibold text-white">{count}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{group}</div>
              </div>
            );
          })}
        </div>
        <div className="mt-8 space-y-6">
          {groups.map((group) => {
            const nodes = graph.nodes.filter((node) => node.type === group);
            if (!nodes.length) return null;
            return (
              <section key={group}>
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{group}</h2>
                <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {nodes.map((node) => (
                    <div key={node.id} className="glass-subtle rounded-xl p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-white">{node.label}</span>
                        <Badge tone={node.risk === "high" ? "red" : node.risk === "medium" ? "amber" : node.type === "skill" ? "green" : "blue"}>
                          {node.risk ?? node.type}
                        </Badge>
                      </div>
                      {node.detail ? <p className="mt-3 text-sm leading-5 text-slate-400">{node.detail}</p> : null}
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </Panel>
      <Panel className="p-5" variant="floating">
        <h2 className="font-semibold text-white">Edges</h2>
        <div className="mt-4 space-y-3">
          {graph.edges.map((edge) => (
            <div key={`${edge.from}-${edge.to}-${edge.label}`} className="glass-subtle rounded-xl p-3">
              <div className="font-mono text-xs text-slate-400">{edge.from}</div>
              <div className="my-2 text-sm text-cyan-200">{"->"} {edge.label}</div>
              <div className="font-mono text-xs text-slate-400">{edge.to}</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
