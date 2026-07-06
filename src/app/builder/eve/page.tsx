import { EveBuilderClient } from "@/components/eve-builder/eve-builder-client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Eve Agent Builder | Marketplace",
  description: "Scaffold and export Eve framework AI agents.",
};

export default function EveBuilderPage() {
  return <EveBuilderClient />;
}
