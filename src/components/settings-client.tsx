"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SignOutButton } from "@clerk/nextjs";
import { AI_MODEL_OPTIONS, resolveAiModelId } from "@/lib/ai-model-catalog";
import { ApiKeysPanel } from "@/components/api-settings-modal";
import { FirebenchHeroIntro, FirebenchPage } from "@/components/firebench";
import {
  MODEL_STORAGE_KEY,
  NOTIFY_FAIL_KEY,
  NOTIFY_PUBLISH_KEY,
  SANDBOX_NET_KEY,
  readDefaultAiModel,
  readNotifyFail,
  readNotifyPublish,
  readSandboxNetworkPref,
  type NotifyPref,
  type SandboxNetworkPref,
  writeDefaultAiModel,
  writeNotifyPrefs,
  writeSandboxNetworkPref,
} from "@/lib/user-prefs";
import "@/app/firebench.css";
import "@/app/builder-guided.css";

export function SettingsClient({ user }: { user: { name: string; email: string } }) {
  const [model, setModel] = useState(readDefaultAiModel);
  const [network, setNetwork] = useState<SandboxNetworkPref>("allow-common");
  const [notifyPublish, setNotifyPublish] = useState<NotifyPref>("in-app");
  const [notifyFail, setNotifyFail] = useState<NotifyPref>("in-app");
  const [saved, setSaved] = useState("");

  useEffect(() => {
    setModel(readDefaultAiModel());
    setNetwork(readSandboxNetworkPref());
    setNotifyPublish(readNotifyPublish());
    setNotifyFail(readNotifyFail());
  }, []);

  function savePrefs() {
    writeDefaultAiModel(model);
    writeSandboxNetworkPref(network);
    writeNotifyPrefs(notifyPublish, notifyFail);
    // Keep legacy keys in sync for older readers during rollout.
    localStorage.setItem(MODEL_STORAGE_KEY, model);
    localStorage.setItem(SANDBOX_NET_KEY, network);
    localStorage.setItem(NOTIFY_PUBLISH_KEY, notifyPublish);
    localStorage.setItem(NOTIFY_FAIL_KEY, notifyFail);
    window.dispatchEvent(new CustomEvent("asm:prefs"));
    setSaved("Preferences saved on this device. Builder, Eve, Terminal, and Sandbox will use them.");
  }

  return (
    <FirebenchPage heat="soft">
      <FirebenchHeroIntro kicker="account" title="Settings" lead="Profile, API keys, and defaults that power Builder, Eve, and Terminal." />

      <div className="mx-auto grid w-full max-w-4xl gap-5 px-1 pb-16">
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">Profile</h2>
          <p className="mt-1 text-sm text-muted-foreground">Signed in as {user.email}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium">Name</span>
              <input className="builder-input mt-1.5" value={user.name} readOnly />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Email</span>
              <input className="builder-input mt-1.5" value={user.email} readOnly />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/projects" className="builder-secondary-button">
              Projects
            </Link>
            <SignOutButton>
              <button type="button" className="builder-secondary-button">
                Sign out
              </button>
            </SignOutButton>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">API keys</h2>
          <p className="mt-1 text-sm text-muted-foreground">Bring your own keys for Copilot, Eve, and Terminal. Server env keys stay the default.</p>
          <div className="mt-4">
            <ApiKeysPanel embedded onSaved={() => setSaved("API keys saved on this device.")} />
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">Defaults</h2>
          <p className="mt-1 text-sm text-muted-foreground">Applied by Skill Builder, Eve, Live Terminal, and Sandbox on this browser.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium">Default AI model</span>
              <select className="builder-input mt-1.5" value={model} onChange={(e) => setModel(resolveAiModelId(e.target.value))}>
                {AI_MODEL_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="font-medium">Sandbox network</span>
              <select className="builder-input mt-1.5" value={network} onChange={(e) => setNetwork(e.target.value as SandboxNetworkPref)}>
                <option value="allow-common">Allow common registries</option>
                <option value="allow-all">Allow broad public hosts</option>
                <option value="block-all">Block all</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="font-medium">Publish notifications</span>
              <select className="builder-input mt-1.5" value={notifyPublish} onChange={(e) => setNotifyPublish(e.target.value as NotifyPref)}>
                <option value="in-app">In-app</option>
                <option value="off">Off</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="font-medium">Failed run notifications</span>
              <select className="builder-input mt-1.5" value={notifyFail} onChange={(e) => setNotifyFail(e.target.value as NotifyPref)}>
                <option value="in-app">In-app</option>
                <option value="off">Off</option>
              </select>
            </label>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" className="builder-primary-button" onClick={savePrefs}>
              Save preferences
            </button>
            {saved ? <span className="text-sm text-muted-foreground">{saved}</span> : null}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">Agent & app shortcuts</h2>
          <p className="mt-1 text-sm text-muted-foreground">Jump to the surfaces these settings power.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/builder" className="builder-secondary-button">
              Skill Builder
            </Link>
            <Link href="/builder/eve" className="builder-secondary-button">
              Eve Builder
            </Link>
            <Link href="/terminal" className="builder-secondary-button">
              Live Terminal
            </Link>
          </div>
        </section>
      </div>
    </FirebenchPage>
  );
}
