"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, BookOpen, Boxes, Hammer, Search, Settings2, Sparkles, TerminalSquare } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { getUserAction } from "@/app/actions";
import type { MarketplaceUser } from "@/lib/types";
import {
  markNotificationsRead,
  readNotifications,
  type AppNotification,
} from "@/lib/user-prefs";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";

type AppShellMode = "content" | "wide" | "canvas";

const topNav = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/projects", label: "Projects" },
  { href: "/terminal", label: "Terminal" },
  { href: "/settings", label: "Settings" },
  { href: "/docs", label: "Docs" },
];

const sections = [
  {
    title: "Catalog",
    items: [
      { href: "/marketplace", label: "Marketplace", icon: Boxes },
      { href: "/skills", label: "Projects", icon: Sparkles },
    ],
  },
  {
    title: "Studio",
    items: [
      { href: "/projects/new", label: "Build", icon: Hammer },
      { href: "/builder/eve", label: "Agent workspace", icon: TerminalSquare },
      { href: "/ai-elements", label: "AI Elements", icon: Boxes },
    ],
  },
  {
    title: "Operations",
    items: [
      { href: "/terminal", label: "Live Terminal", icon: TerminalSquare },
    ],
  },
  {
    title: "Account",
    items: [
      { href: "/settings", label: "Settings", icon: Settings2 },
      { href: "/docs", label: "Documentation", icon: BookOpen },
      { href: "/cli", label: "CLI", icon: TerminalSquare },
    ],
  },
];

export function AppShell({
  children,
  mode = "content",
  sidebarDefaultOpen = true,
}: {
  children: ReactNode;
  mode?: AppShellMode;
  /** When false, sidebar starts icon-collapsed to free workspace width. */
  sidebarDefaultOpen?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [user, setUser] = useState<MarketplaceUser | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    getUserAction().then(setUser).catch(() => setUser(null));
  }, []);

  useEffect(() => {
    const refresh = () => setNotifications(readNotifications());
    refresh();
    window.addEventListener("asm:notifications", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("asm:notifications", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const unreadCount = notifications.filter((item) => !item.read).length;
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "A";
  const accountName = user?.name ?? "Account";
  const accountDetail = user?.email ?? "Sign in to publish and manage skills";

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = search.trim();
    router.push(query ? `/marketplace?search=${encodeURIComponent(query)}` : "/marketplace");
  }

  const contentClass =
    mode === "canvas"
      ? "w-full"
      : mode === "wide"
        ? "mx-auto w-full max-w-[1680px] px-4 py-5 sm:px-6 lg:px-8"
        : "mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8";

  return (
    <SidebarProvider defaultOpen={sidebarDefaultOpen}>
      <div className="app-shell-v2 flex min-h-screen w-full">
        <Sidebar collapsible="icon">
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton size="lg" render={<Link href="/marketplace" />}>
                  <span className="brand-mark grid size-8 shrink-0 place-items-center rounded-md">
                    <Sparkles className="size-4" aria-hidden="true" />
                  </span>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-sm font-semibold">Agent Skill Marketplace</span>
                    <span className="truncate text-xs text-sidebar-foreground/70">Catalog · Studio · Account</span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>

          <SidebarContent>
            {sections.map((section) => (
              <SidebarGroup key={section.title}>
                <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {section.items.map((item) => {
                      const active = isActivePath(pathname, item.href);
                      const Icon = item.icon;
                      return (
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuButton
                            render={<Link href={item.href} />}
                            isActive={active}
                            tooltip={item.label}
                            className={active ? "nav-link-active" : undefined}
                          >
                            <Icon className="size-4" aria-hidden="true" />
                            <span>{item.label}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>

          <SidebarSeparator />
          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton size="lg" render={<Link href={user ? "/settings" : "/sign-in"} />}>
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-sidebar-accent text-xs font-semibold ring-1 ring-sidebar-border">
                    {initials}
                  </span>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-sm font-semibold">{accountName}</span>
                    <span className="truncate text-xs text-sidebar-foreground/50">{accountDetail}</span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>

        <SidebarInset>
          <header className="topbar-v2 sticky inset-x-0 top-0 z-40 flex h-14 items-center gap-4 px-4 lg:px-6">
            <SidebarTrigger className="-ml-1" />
            <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
              {topNav.map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`rounded-md border border-transparent px-3 py-1.5 text-sm font-medium transition ${
                      active ? "nav-link-active" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <form
              onSubmit={submitSearch}
              role="search"
              className="global-search ml-auto hidden w-full max-w-md items-center rounded-md px-3 py-1.5 md:flex"
            >
              <Search className="mr-2 size-4 text-muted-foreground" aria-hidden="true" />
              <input
                aria-label="Search marketplace skills"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search marketplace skills"
                className="h-5 flex-1 border-0 bg-transparent p-0 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              <button className="ml-2 rounded border border-border px-2 py-0.5 font-mono text-[10px] text-muted-foreground" type="submit">
                enter
              </button>
            </form>

            <div className="ml-auto flex items-center gap-1 md:ml-0">
              <TopButton href="/docs" icon={<BookOpen className="size-4" />} label="Docs" />
              <button
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
                onClick={() => {
                  setNotificationsOpen((value) => {
                    const next = !value;
                    if (next) markNotificationsRead();
                    return next;
                  });
                }}
                className="relative grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                type="button"
              >
                <Bell className="size-4" />
                {unreadCount ? (
                  <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-primary" aria-hidden="true" />
                ) : null}
              </button>
              <Link
                href={user ? "/settings" : "/sign-in"}
                aria-label={user ? `Open settings for ${user.name}` : "Sign in"}
                className="ml-1 grid size-9 place-items-center rounded-full bg-sidebar-accent text-xs font-semibold ring-1 ring-sidebar-border"
              >
                {initials}
              </Link>
            </div>

            {notificationsOpen ? (
              <div className="absolute right-4 top-12 w-80 rounded-md border border-border bg-popover p-4 shadow-lg">
                <div className="text-sm font-semibold text-popover-foreground">Notifications</div>
                {notifications.length ? (
                  <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto">
                    {notifications.slice(0, 8).map((item) => (
                      <li key={item.id} className="rounded-md border border-border bg-background px-3 py-2">
                        <div className="text-sm font-medium text-foreground">{item.title}</div>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.body}</p>
                        {item.href ? (
                          <Link href={item.href} className="mt-2 inline-block text-xs font-semibold text-primary hover:underline" onClick={() => setNotificationsOpen(false)}>
                            Open
                          </Link>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm leading-5 text-muted-foreground">No notifications yet.</p>
                )}
              </div>
            ) : null}
          </header>

          <div className="border-b border-sidebar-border bg-sidebar px-4 py-3 md:hidden">
            <div className="flex gap-2 overflow-x-auto" aria-label="Mobile navigation">
              {topNav.map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`shrink-0 rounded-md border px-3 py-2 text-sm font-medium ${
                      active ? "nav-link-active" : "border-sidebar-border bg-sidebar-accent text-sidebar-foreground"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <main className="workspace min-h-[calc(100vh-3.5rem)]">
            <div className={contentClass}>{children}</div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function TopButton({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  return (
    <Link href={href} className="hidden items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground sm:inline-flex">
      {icon}
      {label}
    </Link>
  );
}

function isActivePath(pathname: string, href: string) {
  if (href === "/marketplace") return pathname === "/" || pathname === "/marketplace";
  if (href === "/projects" || href === "/skills") {
    return pathname === "/projects" || pathname === "/skills" || pathname.startsWith("/projects/");
  }
  if (href === "/projects/new") {
    return pathname === "/projects/new" || pathname === "/builder" || (/^\/builder\/[^/]+$/.test(pathname) && !pathname.startsWith("/builder/eve"));
  }
  if (href === "/builder/eve") return pathname === "/builder/eve" || pathname.startsWith("/builder/eve/");
  return pathname === href || pathname.startsWith(`${href}/`);
}
