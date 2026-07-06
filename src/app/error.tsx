"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 text-center">
      <div className="grid size-16 place-items-center rounded-md border border-brand-border bg-brand-soft text-2xl text-brand">
        ⚠️
      </div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Something went wrong
        </h1>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          An unexpected error occurred. You can try again or return to the
          marketplace.
        </p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="h-10 rounded-md border border-brand bg-brand px-4 text-sm font-semibold text-brand-foreground transition hover:brightness-110 focus-visible:ring-3 focus-visible:ring-brand/50"
        >
          Try again
        </button>
        <a
          href="/marketplace"
          className="inline-flex h-10 items-center rounded-md border border-border bg-background px-4 text-sm font-semibold text-foreground transition hover:bg-muted focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/50"
        >
          Go to Marketplace
        </a>
      </div>
      {error.digest ? (
        <p className="font-mono text-xs text-muted-foreground">
          Error ID: {error.digest}
        </p>
      ) : null}
    </div>
  );
}
