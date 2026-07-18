"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, KeyRound, X } from "lucide-react";

export type ApiKeys = {
  openai?: string;
  anthropic?: string;
  google?: string;
  xai?: string;
  groq?: string;
  deepseek?: string;
};

const emptyKeys: ApiKeys = {
  openai: "",
  anthropic: "",
  google: "",
  xai: "",
  groq: "",
  deepseek: "",
};

export function ApiSettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [keys, setKeys] = useState<ApiKeys>(emptyKeys);
  const activeCount = Object.values(keys).filter((value) => value?.trim()).length;

  useEffect(() => {
    if (!isOpen) return;
    try {
      const stored = localStorage.getItem("ai_api_keys");
      setKeys(stored ? { ...emptyKeys, ...(JSON.parse(stored) as ApiKeys) } : emptyKeys);
    } catch {
      setKeys(emptyKeys);
    }
  }, [isOpen]);

  function save() {
    localStorage.setItem("ai_api_keys", JSON.stringify(keys));
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="api-settings-title">
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-2xl">
        <button type="button" onClick={onClose} className="absolute right-4 top-4 grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close API settings"><X className="size-5" /></button>
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary"><KeyRound className="size-5" /></span>
          <div><h2 id="api-settings-title" className="text-lg font-semibold text-foreground">Activate API keys</h2><p className="mt-1 text-sm text-muted-foreground">Choose a model in the Builder, then save its provider key here. Keys stay only in this browser.</p></div>
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-xs text-muted-foreground"><CheckCircle2 className="size-4 text-primary" />{activeCount ? `${activeCount} provider key${activeCount === 1 ? "" : "s"} currently active.` : "No provider keys are active yet."}</div>
        <div className="mt-5 space-y-4">
          <KeyField label="OpenAI" placeholder="sk-..." value={keys.openai ?? ""} onChange={(value) => setKeys({ ...keys, openai: value })} />
          <KeyField label="Anthropic" placeholder="sk-ant-..." value={keys.anthropic ?? ""} onChange={(value) => setKeys({ ...keys, anthropic: value })} />
          <KeyField label="Google Gemini" placeholder="AIza..." value={keys.google ?? ""} onChange={(value) => setKeys({ ...keys, google: value })} />
          <KeyField label="xAI Grok" placeholder="xai-..." value={keys.xai ?? ""} onChange={(value) => setKeys({ ...keys, xai: value })} />
          <KeyField label="Groq" placeholder="gsk_..." value={keys.groq ?? ""} onChange={(value) => setKeys({ ...keys, groq: value })} />
          <KeyField label="DeepSeek" placeholder="sk-..." value={keys.deepseek ?? ""} onChange={(value) => setKeys({ ...keys, deepseek: value })} />
        </div>
        <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onClose} className="builder-secondary-button">Cancel</button><button type="button" onClick={save} className="builder-primary-button">Save and activate</button></div>
      </div>
    </div>
  );
}

function KeyField({ label, placeholder, value, onChange }: { label: string; placeholder: string; value: string; onChange: (value: string) => void }) {
  return <label className="block"><span className="flex items-center justify-between text-sm font-medium text-foreground"><span>{label} API key</span>{value.trim() ? <span className="text-xs font-semibold text-primary">Active</span> : null}</span><input type="password" placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} className="builder-input mt-2 font-mono" /></label>;
}
