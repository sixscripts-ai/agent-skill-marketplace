"use client";

import { Sparkles, Terminal } from "lucide-react";

export function MarketplaceHero({ onBrowseClick }: { onBrowseClick?: () => void }) {
  return (
    <section className="flex flex-col items-center py-12 text-center lg:py-16">
      {/* Pill badge */}
      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
        <Sparkles className="size-4 text-cyan-400" />
        <span className="font-mono text-[13px] tracking-wide text-gray-300">Autonomous Agent Skill System</span>
      </div>

      {/* Heading */}
      <h1 className="mt-6 font-mono text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
        <span className="cyber-gradient-text">AGENT SKILL</span>
        <br />
        <span className="text-white">MARKETPLACE</span>
      </h1>

      {/* Subtitle */}
      <p className="mt-4 max-w-xl text-base leading-relaxed text-gray-400 sm:text-lg">
        Browse, run, evaluate, and install portable AI agent skills with traced execution.
      </p>

      {/* CTAs */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <button
          onClick={onBrowseClick}
          className="cyber-btn-primary inline-flex h-11 items-center gap-2 px-6 text-sm"
        >
          Browse Skills
        </button>
        <a
          href="/builder"
          className="cyber-btn-secondary inline-flex h-11 items-center gap-2 px-6 text-sm"
        >
          <Terminal className="size-4" />
          New Skill
        </a>
      </div>

      {/* Tech strip */}
      <div className="mt-10 flex items-center gap-6 font-mono text-xs tracking-wider text-gray-500">
        <span>Next.js</span>
        <span className="text-gray-700">•</span>
        <span>Tailwind</span>
        <span className="text-gray-700">•</span>
        <span>shadcn/ui</span>
        <span className="text-gray-700">•</span>
        <span>Prisma</span>
      </div>
    </section>
  );
}
