import { AppShell } from "@/components/app-shell";
import { MarketplaceClient } from "@/components/marketplace-client";
import { listMarketplaceSkills } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function MarketplacePage() {
  const skills = await listMarketplaceSkills();

  return (
    <AppShell>
      <MarketplaceClient skills={skills} />
    </AppShell>
  );
}
