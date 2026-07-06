import { AppShell } from "@/components/app-shell";
import { Panel } from "@/components/ui";

export default function MarketplaceLoading() {
  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="h-10 w-48 animate-pulse rounded-md bg-muted" />
            <div className="mt-2 h-5 w-96 animate-pulse rounded-md bg-muted" />
          </div>
          <div className="h-9 w-24 animate-pulse rounded-md bg-muted" />
        </div>

        <Panel className="h-32 animate-pulse"><span className="sr-only">Loading guides</span></Panel>
        
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
           {Array.from({ length: 4 }).map((_, index) => <Panel key={index} className="h-24 animate-pulse" />)}
        </div>

        <Panel className="h-36 animate-pulse"><span className="sr-only">Loading filters</span></Panel>

        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
          <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Panel key={index} className="h-80 animate-pulse">
                <span className="sr-only">Loading skill card</span>
              </Panel>
            ))}
          </section>
          
          <aside className="flex flex-col gap-4">
            <Panel className="h-96 animate-pulse">
              <span className="sr-only">Loading skill details</span>
            </Panel>
            <Panel className="h-64 animate-pulse">
              <span className="sr-only">Loading trends</span>
            </Panel>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
