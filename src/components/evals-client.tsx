"use client";

import { useState } from "react";
import { ActionGuide, FeatureWalkthrough } from "@/components/feature-walkthrough";
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
    <div className="flex flex-col gap-6">
      <Panel className="p-6">
        <h1 className="text-3xl font-semibold text-neutral-950">{skill.name} Evaluations</h1>
        <p className="mt-3 text-sm leading-6 text-neutral-600">
          Create saved test cases, run suites against the current version, and track regression results.
        </p>
      </Panel>

      <ActionGuide
        steps={[
          { label: "1", title: "Write scenario", body: "Use a real prompt the skill should handle." },
          { label: "2", title: "Set expected", body: "Describe what a useful answer must include." },
          { label: "3", title: "Save case", body: "Store the case in a named suite." },
          { label: "4", title: "Run suite", body: "Score the current skill version." },
          { label: "5", title: "Check trend", body: "Use regressions to decide whether a version got worse." },
        ]}
      />

      <FeatureWalkthrough
        title="Evals are saved tests for a skill."
        description="Use this page to define what the skill should do, run those checks against the current version, and watch whether quality improves or regresses over time."
        example="Create a case where shell permission is denied. Expected result: the skill explains the blocked action and still returns useful next steps."
        why="A portfolio-grade AI app should not just run once. It should show that skill behavior can be tested, scored, and compared between versions."
        items={[
          {
            title: "Suite",
            body: "A named group of related tests, such as Draft Quality, Security Review, or Trace Grounding.",
          },
          {
            title: "Case input",
            body: "The prompt or scenario the skill must handle. Write it like a real user request.",
          },
          {
            title: "Expected behavior",
            body: "The standard the output should meet. This makes the test meaningful instead of just checking that text exists.",
          },
          {
            title: "Score trend",
            body: "Saved results show pass/fail counts and regressions, so new versions can be compared to older ones.",
          },
        ]}
      />

      <Panel className="p-5">
        <h2 className="font-semibold text-neutral-950">Create a saved test</h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          Example: input a denied-permission scenario, then expect the skill to explain the block and preserve trace evidence.
        </p>
        <div className="mt-4 grid gap-3 lg:grid-cols-[0.8fr_1.2fr_1.2fr_0.8fr_auto]">
          <Input label="Suite" testId="eval-suite-name" value={suiteName} onChange={setSuiteName} />
          <Input label="Input" testId="eval-input" value={input} onChange={setInput} />
          <Input label="Expected" testId="eval-expected" value={expected} onChange={setExpected} />
          <Input label="Assertion" testId="eval-assertion" value={assertionType} onChange={setAssertionType} />
          <button
            onClick={addCase}
            data-testid="eval-save-case"
            className="self-end rounded-md border border-neutral-950 bg-neutral-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            Save case
          </button>
        </div>
      </Panel>

      {suites.map((suite) => (
        <Panel key={suite.name} className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 p-5">
            <div>
              <h2 className="font-semibold text-neutral-950">{suite.name}</h2>
              <p className="mt-1 text-sm text-neutral-500">{suite.cases.length} saved case(s)</p>
            </div>
            <button
              onClick={() => runSuite(suite.name)}
              disabled={isRunning}
              data-testid="eval-run-suite"
              className="rounded-md border border-neutral-300 bg-[color-mix(in_srgb,var(--fire-paper)_75%,white)] px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-100 disabled:cursor-wait disabled:opacity-60"
            >
              {isRunning ? "Running..." : "Run suite"}
            </button>
          </div>
          <div className="grid gap-0 lg:grid-cols-[1fr_420px]">
            <div className="p-5">
              <h3 className="text-sm font-semibold text-neutral-950">Cases</h3>
              <div className="mt-4 overflow-hidden rounded-md border border-neutral-200">
                {suite.cases.map((item) => (
                    <div key={`${item.input}-${item.assertionType}`} className="grid gap-3 border-b border-neutral-200 bg-[color-mix(in_srgb,var(--fire-paper)_75%,white)] p-4 last:border-b-0 md:grid-cols-[1fr_1fr_120px]">
                    <div className="text-sm text-neutral-700">{item.input}</div>
                    <div className="text-sm text-neutral-600">{item.expected}</div>
                    <Badge tone={item.status === "pass" ? "green" : "red"}>{item.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-neutral-200 p-5 lg:border-l lg:border-t-0">
              <h3 className="text-sm font-semibold text-neutral-950">Score trend</h3>
              <div className="mt-4 flex flex-col gap-3">
                {suite.results.map((result) => (
                  <div key={`${result.version}-${result.createdAt}`} className="rounded-md border border-neutral-200 bg-neutral-50 p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-neutral-950">{result.version}</span>
                      <Badge tone={result.regressions ? "amber" : "green"}>
                        {result.regressions ? `${result.regressions} regression` : "stable"}
                      </Badge>
                    </div>
                    <div className="mt-4 h-2 rounded bg-neutral-200">
                      <div className="h-2 rounded bg-neutral-950" style={{ width: `${result.score}%` }} />
                    </div>
                    <div className="mt-3 text-sm text-neutral-600">
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
  testId,
  value,
  onChange,
}: {
  label: string;
  testId: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-medium text-neutral-700">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        data-testid={testId}
        className="mt-2 h-11 w-full rounded-md border px-3 text-sm outline-none"
      />
    </label>
  );
}
