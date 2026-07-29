import { DEFAULT_AI_MODEL, resolveAiModelId, type AiModelId } from "@/lib/ai-model-catalog";

export const MODEL_STORAGE_KEY = "builder_copilot_model";
export const SANDBOX_NET_KEY = "asm_sandbox_network_default";
export const NOTIFY_PUBLISH_KEY = "asm_notify_publish";
export const NOTIFY_FAIL_KEY = "asm_notify_failed_runs";
export const NOTIFICATIONS_STORAGE_KEY = "asm_notifications";

export type SandboxNetworkPref = "allow-common" | "allow-all" | "block-all";
export type NotifyPref = "in-app" | "off";

export type AppNotification = {
  id: string;
  kind: "publish" | "run-failed" | "info";
  title: string;
  body: string;
  href?: string;
  createdAt: string;
  read: boolean;
};

const COMMON_HOSTS = ["registry.npmjs.org", "github.com", "pypi.org", "files.pythonhosted.org"];
const BROAD_HOSTS = [
  ...COMMON_HOSTS,
  "nodejs.org",
  "registry.yarnpkg.com",
  "cdn.jsdelivr.net",
  "raw.githubusercontent.com",
  "api.github.com",
  "crates.io",
  "static.crates.io",
  "proxy.golang.org",
  "sum.golang.org",
];

export function readDefaultAiModel(): AiModelId {
  if (typeof window === "undefined") return DEFAULT_AI_MODEL;
  return resolveAiModelId(localStorage.getItem(MODEL_STORAGE_KEY));
}

export function writeDefaultAiModel(model: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(MODEL_STORAGE_KEY, resolveAiModelId(model));
}

export function readSandboxNetworkPref(): SandboxNetworkPref {
  if (typeof window === "undefined") return "allow-common";
  const value = localStorage.getItem(SANDBOX_NET_KEY);
  if (value === "allow-all" || value === "block-all" || value === "allow-common") return value;
  return "allow-common";
}

export function writeSandboxNetworkPref(value: SandboxNetworkPref) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SANDBOX_NET_KEY, value);
}

export function networkAllowlistFromPref(pref: SandboxNetworkPref = readSandboxNetworkPref()): string[] {
  if (pref === "block-all") return [];
  if (pref === "allow-all") return BROAD_HOSTS.slice(0, 20);
  return COMMON_HOSTS;
}

export function networkAllowlistTextFromPref(pref: SandboxNetworkPref = readSandboxNetworkPref()): string {
  return networkAllowlistFromPref(pref).join(",");
}

export function readNotifyPublish(): NotifyPref {
  if (typeof window === "undefined") return "in-app";
  return localStorage.getItem(NOTIFY_PUBLISH_KEY) === "off" ? "off" : "in-app";
}

export function readNotifyFail(): NotifyPref {
  if (typeof window === "undefined") return "in-app";
  return localStorage.getItem(NOTIFY_FAIL_KEY) === "off" ? "off" : "in-app";
}

export function writeNotifyPrefs(publish: NotifyPref, fail: NotifyPref) {
  if (typeof window === "undefined") return;
  localStorage.setItem(NOTIFY_PUBLISH_KEY, publish);
  localStorage.setItem(NOTIFY_FAIL_KEY, fail);
}

export function readNotifications(): AppNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(NOTIFICATIONS_STORAGE_KEY) || "[]") as AppNotification[];
    return Array.isArray(raw) ? raw.slice(0, 40) : [];
  } catch {
    return [];
  }
}

export function pushNotification(input: Omit<AppNotification, "id" | "createdAt" | "read">) {
  if (typeof window === "undefined") return;
  if (input.kind === "publish" && readNotifyPublish() === "off") return;
  if (input.kind === "run-failed" && readNotifyFail() === "off") return;
  const next: AppNotification = {
    ...input,
    id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    read: false,
  };
  const all = [next, ...readNotifications()].slice(0, 40);
  localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(all));
  window.dispatchEvent(new CustomEvent("asm:notifications"));
}

export function markNotificationsRead() {
  if (typeof window === "undefined") return;
  const all = readNotifications().map((item) => ({ ...item, read: true }));
  localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(all));
  window.dispatchEvent(new CustomEvent("asm:notifications"));
}
