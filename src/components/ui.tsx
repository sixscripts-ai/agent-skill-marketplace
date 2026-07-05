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
    neutral: "border-neutral-300 bg-neutral-100 text-neutral-700",
    green: "border-green-200 bg-green-50 text-green-700",
    amber: "border-yellow-200 bg-yellow-50 text-yellow-700",
    red: "border-red-200 bg-red-50 text-red-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
  };

  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
  testId,
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
  testId?: string;
}) {
  return (
    <Link
      href={href}
      data-testid={testId}
      className={
        variant === "primary"
          ? "btn-primary inline-flex h-10 items-center justify-center rounded-md border border-neutral-950 bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800"
          : "inline-flex h-10 items-center justify-center rounded-md border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-100"
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
    default: "border border-neutral-200 bg-white ",
    floating: "border border-neutral-200 bg-white ",
    toolbar: "border border-neutral-200 bg-white ",
    subtle: "border border-neutral-200 bg-neutral-50",
  };

  return <section className={`rounded-md ${variants[variant]} ${className}`}>{children}</section>;
}

export function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-2xl font-semibold text-neutral-950">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.16em] text-neutral-500">{label}</div>
    </div>
  );
}
