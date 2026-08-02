import { ClerkProviderLayout } from "@/components/clerk-provider-layout";

export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  return <ClerkProviderLayout>{children}</ClerkProviderLayout>;
}
