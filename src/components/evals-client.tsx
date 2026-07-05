"use client";

import { useState } from "react";
import type { EvaluationSuite, Skill } from "@/lib/types";
import { Badge, Panel } from "./ui";

export function EvalsClient({ skill }: { skill: Skill }) {
  const [suites, setSuites] = useState<EvaluationSuite[]>(skill.evalSuites);
  const [suiteName, setSuiteName] = useState(skill.evalSuites[0]?.name ?? "Draft Quality");
  const [input, setInput] = useState("Run the skill against a denied permission trace.");
  const [expected, setExpected] = useState("Explains the blocked action and preserves trace evidence.");
  const [assertionType, setAssertionType] = useState("trace_grounding");
  const [isRunning, setIsRunning] = useState(false);

  async function addCase() {
    const response = await fetch(`/api/evals/${skill.slug}/run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "add-case", suiteName, input, expected, assertionType }),
    });
    const json = (await response.json()) as { suite: EvaluationSuite };
    setSuites((current) => [json.suite, ...current.filter((suite) => suite.name !== json.suite.name)]);
  }

  async function runSuite(name: string) {
    setIsRunning(true);
    const response = await fetch(`/api/evals/${skill.slug}/run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "run-suite", suiteName: name }),
    });
    const json = (await response.json()) as { suite: EvaluationSuite };
    setSuites((current) => [json.suite, ...current.filter((suite) => suite.name !== json.suite.name)]);
    setIsRunning(false);
  }

  return (
    <div className="space-y-6">
      <Panel className="p-6" variant="floating">
        <h1 className="text-3xl font-semibold text-white">{skill.name} Evaluations</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Create saved test cases, run suites against the current version, and track regression results.
        </p>
      </Panel>

      <Panel className="p-5" variant="floating">
        <h2 className="font-semibold text-white">Author eval case</h2>
        <div className="mt-4 grid gap-3 lg:grid-cols-[0.8fr_1.2fr_1.2fr_0.8fr_auto]">
          <Input label="Suite" value={suiteName} onChange={setSuiteName} />
          <Input label="Input" value={input} onChange={setInput} />
          <Input label="Expected" value={expected} onChange={setExpected} />
          <Input label="Assertion" value={assertionType} onChange={setAssertionType} />
          <button
            onClick={addCase}
            className="self-end rounded-md bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
          >
            Save case
          </button>
        </div>
      </Panel>

      {suites.map((suite) => (
        <Panel key={suite.name} className="overflow-hidden" variant="floating">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-5">
            <div>
              <h2 className="font-semibold text-white">{suite.name}</h2>
              <p className="mt-1 text-sm text-slate-500">{suite.cases.length} saved case(s)</p>
            </div>
            <button
              onClick={() => runSuite(suite.name)}
              disabled={isRunning}
              className="rounded-md border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/[0.08] disabled:cursor-wait disabled:opacity-60"
            >
              {isRunning ? "Running..." : "Run suite"}
            </button>
          </div>
          <div className="grid gap-0 lg:grid-cols-[1fr_420px]">
            <div className="p-5">
              <h3 className="text-sm font-semibold text-white">Cases</h3>
              <div className="mt-4 overflow-hidden rounded-lg border border-white/10">
                {suite.cases.map((item) => (
                    <div key={`${item.input}-${item.assertionType}`} className="grid gap-3 border-b border-white/10 bg-white/[0.025] p-4 last:border-b-0 md:grid-cols-[1fr_1fr_120px]">
                    <div className="text-sm text-slate-300">{item.input}</div>
                    <div className="text-sm text-slate-400">{item.expected}</div>
                    <Badge tone={item.status === "pass" ? "green" : "red"}>{item.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-white/10 p-5 lg:border-l lg:border-t-0">
              <h3 className="text-sm font-semibold text-white">Score trend</h3>
              <div className="mt-4 space-y-3">
                {suite.results.map((result) => (
                  <div key={`${result.version}-${result.createdAt}`} className="glass-subtle rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">{result.version}</span>
                      <Badge tone={result.regressions ? "amber" : "green"}>
                        {result.regressions ? `${result.regressions} regression` : "stable"}
                      </Badge>
                    </div>
                    <div className="mt-4 h-2 rounded bg-white/10">
                      <div className="h-2 rounded bg-cyan-300" style={{ width: `${result.score}%` }} />
                    </div>
                    <div className="mt-3 text-sm text-slate-400">
                      {result.score}% score, {result.passed} passed, {result.failed} failed
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Panel>
      ))}
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-medium text-slate-300">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none focus:border-cyan-300/60"
      />
    </label>
  );
}
