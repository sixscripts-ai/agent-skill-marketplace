import { Badge, Panel } from "@/components/ui";

export type WalkthroughItem = {
  title: string;
  body: string;
};

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
    <Panel className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Page guide</div>
          <h2 className="mt-2 text-lg font-semibold text-neutral-950">{title}</h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-neutral-600">{description}</p>
        </div>
        <Badge tone="blue">start here</Badge>
      </div>
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
