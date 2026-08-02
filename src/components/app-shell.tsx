import { getOptionalUser } from "@/lib/auth";
import { AppShellClient } from "@/components/app-shell-client";
import type { ReactNode } from "react";

type AppShellMode = "content" | "wide" | "canvas";

export async function AppShell({
  children,
  mode = "content",
  sidebarDefaultOpen = true,
}: {
  children: ReactNode;
  mode?: AppShellMode;
  sidebarDefaultOpen?: boolean;
}) {
  const user = (await getOptionalUser()) ?? null;
  return (
    <AppShellClient mode={mode} sidebarDefaultOpen={sidebarDefaultOpen} initialUser={user}>
      {children}
    </AppShellClient>
  );
}
