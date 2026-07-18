"use client";

import { useEffect } from "react";

export default function EveBuilderError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Eve builder render failed", { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col justify-center gap-4 px-6 py-16">
      <p className="text-sm font-medium text-destructive">Eve could not load.</p>
      <h1 className="text-2xl font-semibold">The builder hit a rendering error.</h1>
      <p className="text-sm text-muted-foreground">Retry the page. If it fails again, use the reference below when checking browser and Vercel logs.</p>
      {error.digest ? <code className="rounded-md border border-border bg-muted p-3 text-xs">Reference: {error.digest}</code> : null}
      <button className="builder-primary-button w-fit" type="button" onClick={reset}>Retry Eve</button>
    </main>
  );
}
