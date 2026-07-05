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
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-neutral-50 px-4 text-center">
      <div className="grid size-16 place-items-center rounded-2xl border border-neutral-200 bg-white text-2xl shadow-sm">
        ⚠️
      </div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">
          Something went wrong
        </h1>
        <p className="mt-2 max-w-md text-sm leading-6 text-neutral-600">
          An unexpected error occurred. You can try again or return to the
          marketplace.
        </p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="h-10 rounded-md border border-neutral-950 bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800"
        >
          Try again
        </button>
        <a
          href="/marketplace"
          className="inline-flex h-10 items-center rounded-md border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-100"
        >
          Go to Marketplace
        </a>
      </div>
      {error.digest ? (
        <p className="font-mono text-xs text-neutral-400">
          Error ID: {error.digest}
        </p>
      ) : null}
    </div>
  );
}
