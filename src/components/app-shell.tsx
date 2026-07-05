import Link from "next/link";
import type { ReactNode } from "react";

const topNav = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/skills/agent-observer/run", label: "Sandbox" },
  { href: "/ai-elements", label: "AI Elements" },
  { href: "/skills/agent-observer/evals", label: "Evals" },
  { href: "/cli", label: "CLI" },
];

const sections = [
  {
    title: "Main",
    items: [
      { href: "/marketplace", label: "Marketplace", icon: "M" },
      { href: "/skills", label: "My Skills", icon: "S" },
      { href: "/skills/agent-observer/run", label: "Sandbox", icon: "R" },
    ],
  },
  {
    title: "Workspace",
    items: [
      { href: "/builder", label: "Builder", icon: "B" },
      { href: "/ai-elements", label: "AI Elements", icon: "A" },
      { href: "/skills/agent-observer/evals", label: "Evaluations", icon: "E" },
      { href: "/traces/agent-observer-demo", label: "Traces", icon: "T" },
      { href: "/skills/agent-observer/graph", label: "Collections", icon: "C" },
    ],
  },
  {
    title: "Distribution",
    items: [
      { href: "/install/agent-observer", label: "Installed", icon: "I" },
      { href: "/cli", label: "Settings", icon: "S" },
    ],
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <header className="topbar fixed inset-x-0 top-0 z-40 h-16">
        <div className="flex h-full items-center gap-4 px-4 lg:px-6">
          <Link href="/marketplace" className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 place-items-center rounded-md border border-neutral-700 bg-white text-sm font-bold text-neutral-950">
              AS
            </span>
            <span className="hidden min-w-0 sm:block">
              <span className="block truncate text-sm font-semibold text-white">Agent Skill Marketplace</span>
              <span className="block truncate text-xs text-neutral-400">secure skills, traced runs</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 lg:flex">
            {topNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-neutral-400 transition hover:bg-neutral-900 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto hidden w-full max-w-md items-center rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 md:flex">
            <span className="mr-2 font-mono text-xs text-neutral-500">/</span>
            <input
              aria-label="Global search"
              placeholder="Search skills, traces, packages"
              className="h-6 flex-1 border-0 bg-transparent p-0 text-sm text-white outline-none placeholder:text-neutral-500"
            />
          </div>
          <div className="ml-auto flex items-center gap-1 md:ml-0">
            <TopButton label="Docs" />
            <TopButton label="API" />
            <IconButton label="Notifications" icon="N" />
            <IconButton label="Theme" icon="T" />
            <div className="ml-1 grid size-8 place-items-center rounded-full bg-neutral-800 text-xs font-semibold text-white">
              AA
            </div>
          </div>
        </div>
      </header>

      <aside className="sidebar fixed bottom-0 left-0 top-16 z-30 hidden w-72 overflow-y-auto p-4 lg:block">
        <div className="flex flex-col gap-6">
          {sections.map((section) => (
            <div key={section.title}>
              <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                {section.title}
              </div>
              <div className="flex flex-col gap-1">
                {section.items.map((item, index) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
                      index === 0 && section.title === "Main"
                        ? "bg-neutral-800 text-white"
                        : "text-neutral-300 hover:bg-neutral-900 hover:text-white"
                    }`}
                  >
                    <span className="grid size-6 place-items-center rounded border border-neutral-700 bg-neutral-950 font-mono text-[11px] text-neutral-300">
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">System Status</div>
                <div className="mt-1 text-xs text-neutral-400">Sandbox routes operational</div>
              </div>
              <span className="size-2 rounded-full bg-green-500" />
            </div>
          </div>
          <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
            <div className="text-sm font-semibold text-white">Ashton Aschenbrener</div>
            <div className="mt-1 text-xs text-neutral-500">sixscripts-ai workspace</div>
          </div>
        </div>
      </aside>

      <div className="border-b border-neutral-200 bg-white px-4 py-3 lg:hidden">
        <div className="mt-16 flex gap-2 overflow-x-auto">
          {topNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <main className="workspace min-h-screen pt-16 lg:pl-72">
        <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </main>
    </div>
  );
}

function TopButton({ label }: { label: string }) {
  return (
    <Link
      href="/marketplace"
      className="hidden rounded-md px-3 py-2 text-sm font-medium text-neutral-400 transition hover:bg-neutral-900 hover:text-white sm:inline-flex"
    >
      {label}
    </Link>
  );
}

function IconButton({ label, icon }: { label: string; icon: string }) {
  return (
    <button
      aria-label={label}
      className="grid size-8 place-items-center rounded-md text-xs font-semibold text-neutral-400 transition hover:bg-neutral-900 hover:text-white"
    >
      {icon}
    </button>
  );
}
