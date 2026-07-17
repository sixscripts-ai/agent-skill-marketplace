import type { ReactNode } from "react";
import "./foundation-overrides.css";
import "./phase-one-marketplace.css";
import "./firecrawl-reference.css";
import "./shell-marketplace-production.css";

export default function AppTemplate({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
