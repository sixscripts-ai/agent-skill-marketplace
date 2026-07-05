import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { MarketplaceClient } from "@/components/marketplace-client";
import { listMarketplaceSkills } from "@/lib/repository";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Marketplace",
  description:
    "Browse and install portable AI agent skills. Filter by category, compatibility, and trust level.",
  openGraph: {
    title: "Marketplace | Agent Skill Marketplace",
    description:
      "Browse and install portable AI agent skills. Filter by category, compatibility, and trust level.",
  },
};

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams?: Promise<{ search?: string }>;
}) {
  const skills = await listMarketplaceSkills();
  const params = await searchParams;

  return (
    <AppShell>
      <MarketplaceClient initialQuery={params?.search ?? ""} skills={skills} />
    </AppShell>
  );
}
