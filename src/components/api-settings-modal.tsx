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

export type ByokFlags = {
  openai?: boolean;
  anthropic?: boolean;
  google?: boolean;
  xai?: boolean;
  groq?: boolean;
  deepseek?: boolean;
};

const emptyKeys: ApiKeys = {
  openai: "",
  anthropic: "",
  google: "",
  xai: "",
  groq: "",
  deepseek: "",
};

const emptyByok: ByokFlags = {
  openai: false,
  anthropic: false,
  google: false,
  xai: false,
  groq: false,
  deepseek: false,
};

const KEYS_STORAGE = "ai_api_keys";
const BYOK_STORAGE = "ai_api_keys_byok";

const providers: Array<{ key: keyof ApiKeys; label: string; placeholder: string }> = [
  { key: "openai", label: "OpenAI", placeholder: "sk-..." },
  { key: "anthropic", label: "Anthropic", placeholder: "sk-ant-..." },
  { key: "google", label: "Google Gemini", placeholder: "AIza..." },
  { key: "xai", label: "xAI Grok", placeholder: "xai-..." },
  { key: "groq", label: "Groq", placeholder: "gsk_..." },
  { key: "deepseek", label: "DeepSeek", placeholder: "sk-..." },
];

export function ApiSettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [keys, setKeys] = useState<ApiKeys>(emptyKeys);
  const [byok, setByok] = useState<ByokFlags>(emptyByok);
  const byokCount = Object.values(byok).filter(Boolean).length;

  useEffect(() => {
    if (!isOpen) return;
    try {
      const storedKeys = localStorage.getItem(KEYS_STORAGE);
      const storedByok = localStorage.getItem(BYOK_STORAGE);
      setKeys(storedKeys ? { ...emptyKeys, ...(JSON.parse(storedKeys) as ApiKeys) } : emptyKeys);
      setByok(storedByok ? { ...emptyByok, ...(JSON.parse(storedByok) as ByokFlags) } : emptyByok);
    } catch {
      setKeys(emptyKeys);
      setByok(emptyByok);
    }
  }, [isOpen]);

  function save() {
    const nextKeys: ApiKeys = { ...emptyKeys };
    const nextByok: ByokFlags = { ...emptyByok };
    for (const provider of providers) {
      if (byok[provider.key]) {
        nextKeys[provider.key] = keys[provider.key] ?? "";
        nextByok[provider.key] = true;
      }
    }
    localStorage.setItem(KEYS_STORAGE, JSON.stringify(nextKeys));
    localStorage.setItem(BYOK_STORAGE, JSON.stringify(nextByok));
    onClose();
  }

  function clearAll() {
    setKeys(emptyKeys);
    setByok(emptyByok);
    localStorage.removeItem(KEYS_STORAGE);
    localStorage.removeItem(BYOK_STORAGE);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="api-settings-title">
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-2xl">
        <button type="button" onClick={onClose} className="absolute right-4 top-4 grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close API settings"><X className="size-5" /></button>
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary"><KeyRound className="size-5" /></span>
          <div>
            <h2 id="api-settings-title" className="text-lg font-semibold text-foreground">API keys</h2>
            <p className="mt-1 text-sm text-muted-foreground">Eve uses server environment keys by default. Enable BYOK only when you want a browser-stored key for a provider.</p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
          <CheckCircle2 className="size-4 text-primary" />
          {byokCount ? `${byokCount} provider${byokCount === 1 ? "" : "s"} using browser-stored BYOK.` : "Using server environment keys for all providers."}
        </div>
        <div className="mt-5 space-y-4">
          {providers.map((provider) => (
            <KeyField
              key={provider.key}
              label={provider.label}
              placeholder={provider.placeholder}
              value={keys[provider.key] ?? ""}
              byok={!!byok[provider.key]}
              onByokChange={(enabled) => setByok({ ...byok, [provider.key]: enabled })}
              onChange={(value) => setKeys({ ...keys, [provider.key]: value })}
              onClear={() => {
                setKeys({ ...keys, [provider.key]: "" });
                setByok({ ...byok, [provider.key]: false });
              }}
            />
          ))}
        </div>
        <div className="mt-6 flex justify-between gap-2">
          <button type="button" onClick={clearAll} className="builder-secondary-button">Clear all BYOK</button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="builder-secondary-button">Cancel</button>
            <button type="button" onClick={save} className="builder-primary-button">Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function KeyField({
  label,
  placeholder,
  value,
  byok,
  onByokChange,
  onChange,
  onClear,
}: {
  label: string;
  placeholder: string;
  value: string;
  byok: boolean;
  onByokChange: (enabled: boolean) => void;
  onChange: (value: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="block rounded-lg border border-border p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={byok} onChange={(event) => onByokChange(event.target.checked)} />
          Use browser key (BYOK)
        </label>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{byok ? "Browser-stored. Sent only when BYOK is enabled." : "Server environment key will be used."}</p>
      {byok ? (
        <>
          <input type="password" placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} className="builder-input mt-2 font-mono" />
          <button type="button" className="mt-2 text-xs font-medium text-muted-foreground underline" onClick={onClear}>Clear BYOK for {label}</button>
        </>
      ) : null}
    </div>
  );
}
