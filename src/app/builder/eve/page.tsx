import "@/app/eve-lifecycle.css";
import "@/app/eve-ai-first.css";
import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { EveAiChat } from "@/components/eve-builder/eve-ai-chat";

export const metadata: Metadata = {
  title: "Eve AI Agent Builder",
  description: "Describe an agent and let Eve generate, test, inspect, and export the complete project.",
};

export default function EveBuilderPage() {
  return <AppShell mode="wide"><EveAiChat /></AppShell>;
}
