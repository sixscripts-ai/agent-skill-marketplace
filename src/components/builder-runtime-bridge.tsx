"use client";

import { useEffect, type ReactNode } from "react";

export function BuilderRuntimeBridge({ children }: { children: ReactNode }) {
  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes("/api/runs/stream") && typeof init?.body === "string") {
        try {
          const body = JSON.parse(init.body) as Record<string, unknown>;
          if (!body.draftSkill) {
            const value = (testId: string) =>
              (document.querySelector(`[data-testid="${testId}"]`) as HTMLInputElement | HTMLTextAreaElement | null)?.value ?? "";
            const selected = (prefix: string) =>
              [...document.querySelectorAll<HTMLElement>(`[data-testid^="${prefix}"][aria-pressed="true"]`)].map(
                (element) => element.dataset.testid?.replace(prefix, "").replaceAll("-", " ") ?? "",
              );
            const slug = value("builder-slug") || String(body.skillSlug || "builder-draft");
            const skillMd = value("builder-skill-md");
            if (skillMd.trim()) {
              body.skillSlug = slug;
              body.draftSkill = {
                name: value("builder-name") || slug,
                slug,
                category: value("builder-category") || "Automation",
                summary: value("builder-summary") || "Unsaved Builder draft used for an in-browser test run.",
                skillMd,
                permissions: selected("builder-toggle-")
                  .filter((item) =>
                    ["read files", "write files", "network", "shell", "browser", "api keys"].includes(item),
                  )
                  .map((item) => item.replaceAll(" ", "_")),
                compatibilityTargets: ["Codex", "Claude", "Antigravity", "OpenCode", "Grok", "VS Code"].filter((target) =>
                  document.querySelector(
                    `[data-testid="builder-toggle-${target.toLowerCase().replaceAll(" ", "-")}"][aria-pressed="true"]`,
                  ),
                ),
                visibility: value("builder-visibility") || "private",
              };
              init = { ...init, body: JSON.stringify(body) };
            }
          }
        } catch {
          /* preserve the original request */
        }
      }
      return originalFetch(input, init);
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, []);
  return <>{children}</>;
}
