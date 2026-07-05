import { AppShell } from "@/components/app-shell";
import { Panel } from "@/components/ui";

export default function MarketplaceLoading() {
  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <div className="h-20 max-w-xl animate-pulse rounded-md bg-neutral-200" />
        <Panel className="h-36 animate-pulse bg-neutral-100"><span className="sr-only">Loading filters</span></Panel>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Panel key={index} className="h-64 animate-pulse bg-neutral-100">
              <span className="sr-only">Loading skill card</span>
            </Panel>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
