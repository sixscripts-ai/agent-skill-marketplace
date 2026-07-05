import type { MarketplaceUser } from "./types";

export const demoUser: MarketplaceUser = {
  id: "demo-user",
  clerkId: "demo-clerk-user",
  name: "Demo Publisher",
  email: "demo@sixscripts.dev",
  role: "admin",
};

export async function getCurrentUser(): Promise<MarketplaceUser> {
  if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY) {
    try {
      const clerk = await import("@clerk/nextjs/server");
      const authResult = await clerk.auth();
      const userId = authResult.userId;
      if (userId) {
        const current = await clerk.currentUser();
        return {
          id: userId,
          clerkId: userId,
          name: current?.fullName ?? current?.username ?? "Signed-in user",
          email: current?.primaryEmailAddress?.emailAddress ?? `${userId}@clerk.local`,
          role: "author",
        };
      }
    } catch {
      return demoUser;
    }
  }

  return demoUser;
}
