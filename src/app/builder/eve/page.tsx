import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { EveBuilderClient } from "@/components/eve-builder/eve-builder-client";

export const metadata: Metadata = {
  title: "Eve Agent Studio",
  description: "Design, validate, test, and export a runnable Eve filesystem-first agent project.",
};

export default function EveBuilderPage() {
  return (
    <AppShell mode="wide">
      <EveBuilderClient />
    </AppShell>
  );
}
