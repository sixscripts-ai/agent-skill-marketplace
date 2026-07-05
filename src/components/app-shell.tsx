import Link from "next/link";
import type { ReactNode } from "react";

const nav = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/builder", label: "Builder" },
  { href: "/skills/agent-observer/run", label: "Runner" },
  { href: "/install/agent-observer", label: "Install" },
  { href: "/cli", label: "CLI" },
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-glass-bg min-h-screen text-slate-100">
      <header className="sticky top-0 z-40 px-4 pt-4 sm:px-6 lg:px-8">
        <div className="glass-surface glass-toolbar mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 rounded-2xl px-4 py-3">
          <Link href="/marketplace" className="glass-subtle flex items-center gap-3 rounded-xl px-3 py-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg border border-cyan-200/30 bg-cyan-200/12 font-mono text-sm font-bold text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]">
              AS
            </span>
            <span>
              <span className="block text-sm font-semibold leading-4 text-white">Agent Skill Marketplace</span>
              <span className="block text-xs leading-4 text-slate-400">portable skills, traced runs</span>
            </span>
          </Link>
          <nav className="glass-subtle hidden items-center gap-1 rounded-xl p-1 md:flex">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-white/[0.1] hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
