import "@/app/eve-lifecycle.css";
import "@/app/eve-ai-first.css";
import "@/app/eve-project-workspace.css";
import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { EveAiChat } from "@/components/eve-builder/eve-ai-chat";
import { EveProjectWorkspaceClient } from "@/components/eve-builder/eve-project-workspace-client";
import { EveWorkspaceProvider } from "@/components/eve-builder/eve-workspace-context";

export const metadata: Metadata = {
  title: "Eve AI Agent Builder",
  description: "Describe an agent and let Eve generate, test, inspect, and export the complete project.",
};

export default function EveBuilderPage() {
  return (
    <AppShell mode="wide">
      <EveWorkspaceProvider>
        <div className="eve-builder-layout">
          <EveAiChat />
          <EveProjectWorkspaceClient />
        </div>
      </EveWorkspaceProvider>
    </AppShell>
  );
}
