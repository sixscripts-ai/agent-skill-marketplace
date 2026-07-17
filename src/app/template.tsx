import type { ReactNode } from "react";
import "./theme-production.css";
import "./shell-marketplace-production.css";
import "./design-system-v2.css";

export default function AppTemplate({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
