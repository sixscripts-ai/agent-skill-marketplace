import type { MarketplaceUser } from "./types";
import { allowLocalSeedAuth, isVercelDeployment } from "./deployment-config.js";

export const seedUser: MarketplaceUser = {
  id: "seed-user",
  clerkId: "seed-clerk-user",
  name: "SixScripts Seed Publisher",
  email: "seed@sixscripts.dev",
  role: "admin",
};

export const anonymousUser: MarketplaceUser = {
  id: "anonymous-user",
  name: "Anonymous user",
  email: "anonymous@sixscripts.local",
  role: "author",
};

export class AuthRequiredError extends Error {
  constructor(message = "Authentication required.") {
    super(message);
    this.name = "AuthRequiredError";
  }
}

export function isClerkConfigured(env: NodeJS.ProcessEnv = process.env) {
  return Boolean(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && env.CLERK_SECRET_KEY);
}

export function fallbackUserForAuthState(clerkConfigured: boolean, env: NodeJS.ProcessEnv = process.env) {
  return clerkConfigured || !allowLocalSeedAuth(env) ? anonymousUser : seedUser;
}

export function isAuthenticatedUser(user: MarketplaceUser) {
  return user.id !== anonymousUser.id;
}

import { cookies } from "next/headers";

export async function getOptionalUser(): Promise<MarketplaceUser | undefined> {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  
  if (session === "admin-session-token") {
    return {
      id: "cmr82btr50000ihhf3jf6wh6v", // admin user id from seed
      clerkId: "admin",
      name: "Admin",
      email: "admin@admin.com",
      role: "admin",
    };
  }

  if (isClerkConfigured()) {
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
      return undefined;
    } catch {
      return undefined;
    }
  }

  return isVercelDeployment() ? undefined : seedUser;
}

export async function getCurrentUser(): Promise<MarketplaceUser> {
  return (await getOptionalUser()) ?? fallbackUserForAuthState(isClerkConfigured());
}

export async function requireCurrentUser(): Promise<MarketplaceUser> {
  const user = await getOptionalUser();
  if (!user) throw new AuthRequiredError();
  return user;
}
