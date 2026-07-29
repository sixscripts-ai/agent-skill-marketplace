import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { BuilderClient } from "@/components/builder-client";
import { BuilderRuntimeBridge } from "@/components/builder-runtime-bridge";

export const metadata: Metadata = {
  title: "New Project | Agent Skill Marketplace",
  description: "Create a portable AI agent skill project with guided Build → Prove → Ship.",
};

export default function NewProjectPage() {
  return (
    <AppShell mode="wide" sidebarDefaultOpen={false}>
      <BuilderRuntimeBridge>
        <BuilderClient />
      </BuilderRuntimeBridge>
    </AppShell>
  );
}
