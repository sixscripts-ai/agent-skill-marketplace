import { AppShell } from "@/components/app-shell";

export default function BuilderLoading() {
  return (
    <AppShell mode="wide">
      <div className="builder-workbench-shell" aria-busy="true" aria-live="polite">
        <div className="builder-guided-header">
          <div className="min-w-0 flex-1">
            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
            <div className="mt-3 h-7 max-w-md animate-pulse rounded bg-muted" />
            <div className="mt-2 h-4 max-w-sm animate-pulse rounded bg-muted" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-40 animate-pulse rounded bg-muted" />
            <div className="h-10 w-36 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="builder-section-rule" role="separator" aria-hidden="true" />
        <div className="grid gap-4">
          <div className="h-28 animate-pulse rounded-lg bg-muted" />
          <div className="h-px bg-border" />
          <div className="h-24 animate-pulse rounded-lg bg-muted" />
        </div>
        <span className="sr-only">Loading Skill Builder</span>
      </div>
    </AppShell>
  );
}
