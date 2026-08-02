"use client";

import { CircleAlert, KeyRound, Rocket } from "lucide-react";

export function BuilderHeader({
  issueCount,
  isSaving,
  onOpenSettings,
  onPublish,
}: {
  issueCount: number;
  isSaving: boolean;
  onOpenSettings: () => void;
  onPublish: () => void;
}) {
  return (
    <header className="builder-toolbar">
      <div className="min-w-0">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Skill Studio</div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Build a portable agent skill</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Define the listing, write the instructions, validate the package, test the behavior, and publish one version from a single workspace.
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <div className={`inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium ${issueCount ? "border-amber-300 bg-amber-50 text-amber-950" : "border-emerald-300 bg-emerald-50 text-emerald-900"}`}>
          <CircleAlert className="size-4" aria-hidden="true" />
          {issueCount ? `${issueCount} issue${issueCount === 1 ? "" : "s"}` : "Ready"}
        </div>
        <button type="button" onClick={onOpenSettings} className="builder-secondary-button">
          <KeyRound className="size-4" aria-hidden="true" />
          API keys
        </button>
        <button
          type="button"
          onClick={onPublish}
          data-testid="builder-publish"
          disabled={issueCount > 0 || isSaving}
          className="builder-primary-button"
        >
          <Rocket className="size-4" aria-hidden="true" />
          {isSaving ? "Publishing..." : "Publish version"}
        </button>
      </div>
    </header>
  );
}
