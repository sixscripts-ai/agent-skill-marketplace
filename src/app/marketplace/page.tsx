import { AppShell } from "@/components/app-shell";
import { MarketplaceClient } from "@/components/marketplace-client";
import { listMarketplaceSkills } from "@/lib/repository";

export const dynamic = "force-dynamic";

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
