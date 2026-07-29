import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { AiElementsCatalog } from "@/components/ai-elements/ai-elements-catalog";
import "./ai-elements.css";

export const metadata: Metadata = {
  title: "AI Elements · Agent Skills",
  description: "Browse and copy AI Elements components for agent interfaces.",
};

export default function AiElementsPage() {
  return (
    <AppShell mode="wide" sidebarDefaultOpen={false}>
      <AiElementsCatalog />
    </AppShell>
  );
}
