import { ClerkProviderLayout } from "@/components/clerk-provider-layout";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <ClerkProviderLayout>{children}</ClerkProviderLayout>;
}
