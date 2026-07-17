import type { ReactNode } from "react";
import "./foundation-overrides.css";
import "./phase-one-marketplace.css";

export default function AppTemplate({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
