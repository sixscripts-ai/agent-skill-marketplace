import "@/app/eve-lifecycle.css";
import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { EveLifecycleModelBridge } from "@/components/eve-builder/eve-lifecycle-model-bridge";

export const metadata: Metadata = {
  title: "Eve Agent Architect",
  description: "Design, test, validate, and export a complete filesystem-first agent project.",
};

export default function EveBuilderPage() {
  return <AppShell mode="wide"><EveLifecycleModelBridge /></AppShell>;
}
