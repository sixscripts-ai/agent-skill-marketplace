"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, BookOpen, Code2, Moon, Search, Sparkles } from "lucide-react";
import { useState, useEffect, type FormEvent } from "react";
import type { ReactNode } from "react";
import { getUserAction } from "@/app/actions";
import type { MarketplaceUser } from "@/lib/types";

const topNav = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/skills/agent-observer/run", label: "Sandbox" },
  { href: "/ai-elements", label: "AI Elements" },
  { href: "/skills/agent-observer/evals", label: "Evals" },
  { href: "/docs", label: "Docs" },
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
      { href: "/skills/agent-observer/run", label: "Run & Traces", icon: "T" },
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
  const pathname = usePathname();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [contrastMode, setContrastMode] = useState(false);
  const [user, setUser] = useState<MarketplaceUser | null>(null);

  useEffect(() => {
    getUserAction().then(setUser);
  }, []);

  const initials = user
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "AA";
  const workspaceName = user
    ? `${user.name.split(" ")[0].toLowerCase()}-workspace`
    : "sixscripts-ai workspace";

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = search.trim();
    router.push(query ? `/marketplace?search=${encodeURIComponent(query)}` : "/marketplace");
  }

  return (
    <div className="app-shell">
      <header className="topbar fixed inset-x-0 top-0 z-40 h-16">
        <div className="flex h-full items-center gap-4 px-4 lg:px-6">
          <Link href="/marketplace" className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 place-items-center rounded-md border border-neutral-700 bg-white text-neutral-950">
              <Sparkles className="size-4" aria-hidden="true" />
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
                aria-current={isActivePath(pathname, item.href) ? "page" : undefined}
                className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                  isActivePath(pathname, item.href)
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <form
            onSubmit={submitSearch}
            role="search"
            className="ml-auto hidden w-full max-w-md items-center rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 md:flex"
          >
            <Search className="mr-2 size-4 text-neutral-500" aria-hidden="true" />
            <input
              aria-label="Global search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search skills, traces, packages"
              className="h-6 flex-1 border-0 bg-transparent p-0 text-sm text-white outline-none placeholder:text-neutral-500"
            />
            <button className="ml-2 rounded border border-neutral-800 px-2 py-1 font-mono text-[10px] text-neutral-400" type="submit">
              enter
            </button>
          </form>
          <div className="ml-auto flex items-center gap-1 md:ml-0">
            <TopButton href="/docs" icon={<BookOpen className="size-4" aria-hidden="true" />} label="Docs" />
            <TopButton href="/api-docs" icon={<Code2 className="size-4" aria-hidden="true" />} label="API" />
            <IconButton
              label="Notifications"
              icon={<Bell className="size-4" aria-hidden="true" />}
              onClick={() => {
                setNotificationsOpen((value) => !value);
                setContrastMode(false);
              }}
              pressed={notificationsOpen}
            />
            <IconButton
              label="Toggle high contrast preview"
              icon={<Moon className="size-4" aria-hidden="true" />}
              onClick={() => {
                setContrastMode((value) => !value);
                setNotificationsOpen(false);
              }}
              pressed={contrastMode}
            />
            <div className="ml-1 grid size-8 place-items-center rounded-full bg-neutral-800 text-xs font-semibold text-white ring-1 ring-neutral-700">
              {initials}
            </div>
          </div>
        </div>
        {notificationsOpen ? (
          <div className="absolute right-4 top-14 w-80 rounded-md border border-neutral-800 bg-neutral-950 p-4 ">
            <div className="text-sm font-semibold text-white">Notifications</div>
            <p className="mt-2 text-sm leading-5 text-neutral-400">
              No unread alerts. Run traces, upload warnings, and package export issues will appear here.
            </p>
          </div>
        ) : null}
        {contrastMode ? (
          <div className="absolute right-4 top-14 w-80 rounded-md border border-neutral-800 bg-neutral-950 p-4 ">
            <div className="text-sm font-semibold text-white">Display mode</div>
            <p className="mt-2 text-sm leading-5 text-neutral-400">
              Monochrome Pro is active. A full persisted theme switch can be added after design tokens are expanded.
            </p>
          </div>
        ) : null}
      </header>

      <aside className="sidebar fixed bottom-0 left-0 top-16 z-30 hidden w-72 overflow-y-auto p-4 lg:block">
        <div className="flex flex-col gap-6">
          {sections.map((section) => (
            <div key={section.title}>
              <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
                {section.title}
              </div>
              <div className="flex flex-col gap-1">
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActivePath(pathname, item.href) ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
                      isActivePath(pathname, item.href)
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
          <div className="rounded-md border border-neutral-800 bg-neutral-900 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">System Status</div>
                <div className="mt-1 text-xs text-neutral-400">Sandbox routes operational</div>
              </div>
              <span className="size-2 rounded-full bg-green-500" />
            </div>
          </div>
          <div className="rounded-md border border-neutral-800 bg-neutral-950 p-4">
            <div className="text-sm font-semibold text-white">{user?.name ?? "Ashton Aschenbrener"}</div>
            <div className="mt-1 text-xs text-neutral-500">{workspaceName}</div>
          </div>
        </div>
      </aside>

      <div className="border-b border-neutral-800 bg-neutral-950 px-4 py-3 lg:hidden">
        <div className="mt-16 flex gap-2 overflow-x-auto">
          {topNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActivePath(pathname, item.href) ? "page" : undefined}
              className={`rounded-md border px-3 py-2 text-sm font-medium ${
                isActivePath(pathname, item.href)
                  ? "border-white bg-white text-neutral-950"
                  : "border-neutral-800 bg-neutral-900 text-neutral-300"
              }`}
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

function TopButton({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="hidden items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-neutral-400 transition hover:bg-neutral-900 hover:text-white sm:inline-flex"
    >
      {icon}
      {label}
    </Link>
  );
}

function IconButton({
  label,
  icon,
  onClick,
  pressed,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  pressed: boolean;
}) {
  return (
    <button
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={`grid size-8 place-items-center rounded-md text-neutral-400 transition hover:bg-neutral-900 hover:text-white ${
        pressed ? "bg-neutral-900 text-white" : ""
      }`}
      type="button"
    >
      {icon}
    </button>
  );
}

function isActivePath(pathname: string, href: string) {
  if (href === "/marketplace") return pathname === "/" || pathname === "/marketplace";
  if (href === "/skills/agent-observer/run") return pathname.includes("/run") || pathname.startsWith("/traces/");
  return pathname === href || pathname.startsWith(`${href}/`);
}
