import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type FirebenchHeat = "soft" | "medium" | "bold";

export function FirebenchPage({
  children,
  heat = "bold",
  canvas = true,
  className,
}: {
  children: ReactNode;
  heat?: FirebenchHeat;
  canvas?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("fb-page", className)} data-heat={heat} data-canvas={canvas ? "true" : "false"}>
      {children}
    </div>
  );
}

export function FirebenchTag({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("fb-tag", className)}>{children}</span>;
}

export function FirebenchHeroIntro({
  kicker,
  title,
  accent,
  lead,
}: {
  kicker?: string;
  title: ReactNode;
  accent?: string;
  lead?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-2">
      {kicker ? <p className="fb-kicker">{kicker}</p> : null}
      <h1 className="fb-title">
        {title}
        {accent ? (
          <>
            {" "}
            <em>{accent}</em>
          </>
        ) : null}
      </h1>
      {lead ? <p className="fb-lead">{lead}</p> : null}
    </div>
  );
}

export type FirebenchTabItem = {
  id: string;
  label: string;
  group: string;
  icon?: ReactNode;
};

export function FirebenchTabStrip({
  groups,
  items,
  activeId,
  onChange,
}: {
  groups: string[];
  items: FirebenchTabItem[];
  activeId: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="fb-tabstrip" role="tablist" aria-label="Playground endpoints">
      {groups.map((group) => {
        const groupItems = items.filter((item) => item.group === group);
        if (groupItems.length === 0) return null;
        return (
          <div key={group} className="fb-tab-group">
            <span className="fb-tab-group-label">{group}</span>
            <div className="fb-tab-row">
              {groupItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={activeId === item.id}
                  className="fb-tab"
                  data-active={activeId === item.id}
                  onClick={() => onChange(item.id)}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function FirebenchHeroCard({
  children,
  actionsLeft,
  actionsRight,
  className,
}: {
  children: ReactNode;
  actionsLeft?: ReactNode;
  actionsRight?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("fb-hero-card", className)}>
      <div className="fb-hero-card__body">{children}</div>
      {actionsLeft || actionsRight ? (
        <div className="fb-hero-card__actions">
          {actionsLeft ? <div className="fb-hero-card__actions-left">{actionsLeft}</div> : null}
          {actionsRight}
        </div>
      ) : null}
    </div>
  );
}

export function FirebenchCta({
  children,
  variant = "primary",
  className,
  ...props
}: ComponentProps<"a"> & { variant?: "primary" | "ghost" }) {
  return (
    <a className={cn("fb-cta", variant === "primary" ? "fb-cta--primary" : "fb-cta--ghost", className)} {...props}>
      {children}
    </a>
  );
}

export function FirebenchButton({
  children,
  variant = "primary",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: "primary" | "ghost" }) {
  return (
    <button
      type="button"
      className={cn("fb-cta", variant === "primary" ? "fb-cta--primary" : "fb-cta--ghost", className)}
      {...props}
    >
      {children}
    </button>
  );
}

export function FirebenchCode({
  children,
  label = "[ CODE ]",
  className,
}: {
  children: string;
  label?: string;
  className?: string;
}) {
  return (
    <pre className={cn("fb-code", className)} data-label={label}>
      {children}
    </pre>
  );
}

export function FirebenchStage({
  label,
  tag,
  children,
}: {
  label: ReactNode;
  tag?: string;
  children: ReactNode;
}) {
  return (
    <div className="fb-stage">
      <div className="fb-stage__label">
        <span>{label}</span>
        {tag ? <FirebenchTag>{tag}</FirebenchTag> : null}
      </div>
      <div className="fb-stage__body">{children}</div>
    </div>
  );
}
