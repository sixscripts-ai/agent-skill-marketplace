import { Badge, Panel } from "@/components/ui";

export type WalkthroughItem = {
  title: string;
  body: string;
};

export type ActionStep = {
  label: string;
  title: string;
  body: string;
};

export function ActionGuide({
  title = "What am I supposed to do?",
  steps,
}: {
  title?: string;
  steps: ActionStep[];
}) {
  return (
    <Panel className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-neutral-950">{title}</h2>
        <Badge tone="blue">quick start</Badge>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {steps.map((step) => (
          <div key={`${step.label}-${step.title}`} className="rounded-md border border-neutral-200 bg-white p-3">
            <div className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">{step.label}</div>
            <div className="mt-2 font-semibold text-neutral-950">{step.title}</div>
            <p className="mt-1 text-sm leading-5 text-neutral-600">{step.body}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function FeatureWalkthrough({
  title,
  description,
  example,
  why,
  items,
}: {
  title: string;
  description: string;
  example: string;
  why: string;
  items: WalkthroughItem[];
}) {
  return (
    <Panel className="p-0">
      <details>
        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Learn how this page works</div>
            <h2 className="mt-2 text-lg font-semibold text-neutral-950">{title}</h2>
          </div>
          <Badge tone="blue">open guide</Badge>
        </summary>
        <div className="border-t border-neutral-200 p-5">
          <p className="max-w-4xl text-sm leading-6 text-neutral-600">{description}</p>
          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            <GuideBlock label="Try this" value={example} />
            <GuideBlock label="Why it matters" value={why} />
            <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Read the page as</div>
              <div className="mt-2 text-sm leading-6 text-neutral-700">
                Left to right: input, controls, evidence, output. If something fails, check the evidence panel before changing the skill.
              </div>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {items.map((item) => (
              <div key={item.title} className="rounded-md border border-neutral-200 bg-white p-4">
                <div className="font-semibold text-neutral-950">{item.title}</div>
                <p className="mt-2 text-sm leading-6 text-neutral-600">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </details>
    </Panel>
  );
}

function GuideBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">{label}</div>
      <div className="mt-2 text-sm leading-6 text-neutral-700">{value}</div>
    </div>
  );
}
