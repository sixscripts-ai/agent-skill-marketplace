import { ClerkProviderLayout } from "@/components/clerk-provider-layout";

export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return <ClerkProviderLayout>{children}</ClerkProviderLayout>;
}
