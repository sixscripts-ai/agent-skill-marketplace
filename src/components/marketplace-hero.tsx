"use client";

import Link from "next/link";
import { ArrowDown, Sparkles, Terminal } from "lucide-react";

export function MarketplaceHero({ onBrowseClick }: { onBrowseClick?: () => void }) {
  return (
    <section className="marketplace-hero-v2 flex flex-col items-start text-left">
      <div className="inline-flex items-center gap-2 rounded-md border border-brand-border bg-background px-3 py-1.5 text-sm font-medium text-brand shadow-[3px_3px_0_var(--brand-soft)]">
        <Sparkles className="size-4" aria-hidden="true" />
        <span>Autonomous Agent Skill System</span>
      </div>

      <h1 className="mt-6 font-semibold text-foreground">
        <span className="text-brand">Agent Skill</span>
        <br />
        Marketplace
      </h1>

      <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
        Discover portable AI skills you can inspect, evaluate, run in a sandbox, and install with clear permissions and traced execution.
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button onClick={onBrowseClick} className="inline-flex h-11 items-center gap-2 rounded-md bg-brand px-5 text-sm font-semibold text-brand-foreground hover:bg-[var(--primary-hover)]">
          Browse skills
          <ArrowDown className="size-4" aria-hidden="true" />
        </button>
        <Link href="/builder" className="inline-flex h-11 items-center gap-2 rounded-md border border-border bg-background px-5 text-sm font-semibold text-foreground hover:bg-muted">
          <Terminal className="size-4" aria-hidden="true" />
          Create a skill
        </Link>
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {["Next.js", "Tailwind", "Prisma", "Vercel Sandbox"].map((item) => (
          <span key={item} className="rounded-md border border-border bg-background px-2.5 py-1.5 font-mono">{item}</span>
        ))}
      </div>
    </section>
  );
}
