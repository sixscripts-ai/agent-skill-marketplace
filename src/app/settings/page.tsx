import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SettingsClient } from "@/components/settings-client";
import { getCurrentUser, isAuthenticatedUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Settings",
  description: "Account, API keys, and defaults for Agent Skill Marketplace.",
};

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!isAuthenticatedUser(user)) redirect("/sign-in");

  return (
    <AppShell mode="wide" sidebarDefaultOpen>
      <SettingsClient user={{ name: user.name, email: user.email }} />
    </AppShell>
  );
}
