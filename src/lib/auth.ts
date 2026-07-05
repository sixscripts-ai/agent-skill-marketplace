import type { MarketplaceUser } from "./types";
import { allowLocalDemoAuth, isVercelDeployment } from "./deployment-config.js";

export const demoUser: MarketplaceUser = {
  id: "demo-user",
  clerkId: "demo-clerk-user",
  name: "Demo Publisher",
  email: "demo@sixscripts.dev",
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
  return clerkConfigured || !allowLocalDemoAuth(env) ? anonymousUser : demoUser;
}

export function isAuthenticatedUser(user: MarketplaceUser) {
  return user.id !== anonymousUser.id;
}

export async function getOptionalUser(): Promise<MarketplaceUser | undefined> {
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

  return isVercelDeployment() ? undefined : demoUser;
}

export async function getCurrentUser(): Promise<MarketplaceUser> {
  return (await getOptionalUser()) ?? fallbackUserForAuthState(isClerkConfigured());
}

export async function requireCurrentUser(): Promise<MarketplaceUser> {
  const user = await getOptionalUser();
  if (!user) throw new AuthRequiredError();
  return user;
}
