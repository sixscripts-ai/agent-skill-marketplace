import { AppShell } from "@/components/app-shell";
import { Panel } from "@/components/ui";

export default function BuilderLoading() {
  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <div className="h-20 max-w-xl animate-pulse rounded-md bg-neutral-200" />
        <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] 2xl:grid-cols-[320px_minmax(0,1fr)_360px]">
          <Panel className="h-[620px] animate-pulse bg-neutral-100"><span className="sr-only">Loading metadata</span></Panel>
          <Panel className="h-[720px] animate-pulse bg-neutral-100"><span className="sr-only">Loading editor</span></Panel>
          <Panel className="h-[620px] animate-pulse bg-neutral-100 lg:col-span-2 2xl:col-span-1">
            <span className="sr-only">Loading validation</span>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
