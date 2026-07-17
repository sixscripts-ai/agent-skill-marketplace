import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ClerkProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </ClerkProvider>
        <Analytics />
      </body>
    </html>
  );
}
