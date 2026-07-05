import { AppShell } from "@/components/app-shell";
import { MarketplaceClient } from "@/components/marketplace-client";
import { getCurrentUser } from "@/lib/auth";
import { listVisibleSkills } from "@/lib/repository";

export default async function MarketplacePage() {
  const user = await getCurrentUser();
  const skills = await listVisibleSkills(user);

  return (
    <AppShell>
      <MarketplaceClient skills={skills} />
    </AppShell>
  );
}
