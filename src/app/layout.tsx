import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://agent-skill-marketplace.vercel.app",
  ),
  title: {
    default: "Agent Skill Marketplace",
    template: "%s | Agent Skill Marketplace",
  },
  description:
    "Browse, run, evaluate, version, trace, and export portable AI agent skills.",
  openGraph: {
    type: "website",
    siteName: "Agent Skill Marketplace",
    title: "Agent Skill Marketplace",
    description:
      "Browse, run, evaluate, version, trace, and export portable AI agent skills.",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Render ClerkProvider only when a publishable key is configured. In local
  // development with missing Clerk keys, the app renders without ClerkProvider
  // so the local seed-auth fallback does not crash inside the provider.
  const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  const content = <TooltipProvider>{children}</TooltipProvider>;

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {clerkEnabled ? <ClerkProvider>{content}</ClerkProvider> : content}
        <Analytics />
      </body>
    </html>
  );
}
