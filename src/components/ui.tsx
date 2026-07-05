import Link from "next/link";
import type { ReactNode } from "react";

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "green" | "amber" | "red" | "blue";
}) {
  const tones = {
    neutral: "border-white/15 bg-white/[0.06] text-slate-200",
    green: "border-emerald-300/30 bg-emerald-300/12 text-emerald-100",
    amber: "border-amber-300/30 bg-amber-300/12 text-amber-100",
    red: "border-red-300/30 bg-red-300/12 text-red-100",
    blue: "border-cyan-300/30 bg-cyan-300/12 text-cyan-100",
  };

  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
}) {
  return (
    <Link
      href={href}
      className={
        variant === "primary"
          ? "inline-flex h-10 items-center justify-center rounded-md border border-cyan-100/40 bg-cyan-200/90 px-4 text-sm font-semibold text-slate-950 shadow-[0_12px_34px_rgba(34,211,238,0.2),inset_0_1px_0_rgba(255,255,255,0.42)] transition hover:bg-cyan-100"
          : "glass-subtle inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-semibold text-slate-100 transition hover:bg-white/[0.1]"
      }
    >
      {children}
    </Link>
  );
}

export function Panel({
  children,
  className = "",
  variant = "default",
}: {
  children: ReactNode;
  className?: string;
  variant?: "default" | "floating" | "toolbar" | "subtle";
}) {
  const variants = {
    default: "glass-surface",
    floating: "glass-surface glass-floating",
    toolbar: "glass-surface glass-toolbar",
    subtle: "glass-subtle",
  };

  return <section className={`rounded-xl ${variants[variant]} ${className}`}>{children}</section>;
}

export function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-2xl font-semibold text-white">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{label}</div>
    </div>
  );
}
