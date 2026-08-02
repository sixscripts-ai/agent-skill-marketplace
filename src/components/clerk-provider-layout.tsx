"use client";

import { ClerkProvider } from "@clerk/nextjs";

/** Client Clerk only for routes that render SignIn / SignUp / SignOutButton. */
export function ClerkProviderLayout({ children }: { children: React.ReactNode }) {
  return <ClerkProvider>{children}</ClerkProvider>;
}
