import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { BuilderClient } from "@/components/builder-client";
import { BuilderRuntimeBridge } from "@/components/builder-runtime-bridge";

export const metadata: Metadata = {
  title: "Skill Builder",
  description: "Create or import, validate, test, download, and publish portable AI agent skills using a guided workflow.",
  openGraph: {
    title: "Skill Builder | Agent Skill Marketplace",
    description: "Create or import, validate, test, download, and publish portable AI agent skills using a guided workflow.",
  },
};

export default function BuilderPage() {
  return <AppShell mode="wide"><BuilderRuntimeBridge><BuilderClient /></BuilderRuntimeBridge></AppShell>;
}
