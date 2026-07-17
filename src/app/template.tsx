import type { ReactNode } from "react";
import "./theme-production.css";
import "./shell-marketplace-production.css";

export default function AppTemplate({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
