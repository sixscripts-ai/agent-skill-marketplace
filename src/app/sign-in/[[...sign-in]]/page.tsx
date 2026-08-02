import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Agent Skill Marketplace to build, run, and publish portable AI agent skills.",
};

export default function Page() {
  return (
    <main id="main" className="flex h-screen w-full items-center justify-center p-4">
      <SignIn routing="hash" />
    </main>
  );
}
