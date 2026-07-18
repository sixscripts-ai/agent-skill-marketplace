import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { BuilderClient } from "@/components/builder-client";
import { BuilderRuntimeBridge } from "@/components/builder-runtime-bridge";
import { BuilderStudio } from "@/components/builder/builder-ui";

export const metadata: Metadata = { title: "Skill Builder", description: "Upload, write, validate, and publish portable AI agent skills using the SKILL.md format.", openGraph: { title: "Skill Builder | Agent Skill Marketplace", description: "Upload, write, validate, and publish portable AI agent skills using the SKILL.md format." } };
export default function BuilderPage() { return <AppShell mode="wide"><BuilderStudio><BuilderRuntimeBridge><BuilderClient /></BuilderRuntimeBridge></BuilderStudio></AppShell>; }
