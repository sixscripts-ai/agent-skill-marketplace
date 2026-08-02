"use client";

import type { ReactNode } from "react";
import { CheckCircle2, CircleAlert } from "lucide-react";

export function BuilderStudio({ children }: { children: ReactNode }) {
  return <div className="builder-studio min-w-0">{children}</div>;
}

export function BuilderPanel({
  title,
  description,
  action,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-border bg-card ${className}`}>
      <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {description ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p> : null}
        </div>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function BuilderField({
  label,
  helper,
  error,
  children,
}: {
  label: string;
  helper?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <span className="mt-2 block">{children}</span>
      {error ? <span className="mt-1.5 block text-xs text-destructive">{error}</span> : helper ? <span className="mt-1.5 block text-xs leading-5 text-muted-foreground">{helper}</span> : null}
    </label>
  );
}

export function BuilderStatus({ valid, children }: { valid: boolean; children: ReactNode }) {
  const Icon = valid ? CheckCircle2 : CircleAlert;
  return (
    <div className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${valid ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-amber-300 bg-amber-50 text-amber-950"}`}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

export function BuilderSectionLabel({ children }: { children: ReactNode }) {
  return <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{children}</div>;
}
