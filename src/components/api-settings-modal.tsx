"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

export type ApiKeys = {
  openai?: string;
  anthropic?: string;
  google?: string;
  xai?: string;
};

export function ApiSettingsModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [keys, setKeys] = useState<ApiKeys>({
    openai: "",
    anthropic: "",
    google: "",
    xai: "",
  });

  useEffect(() => {
    if (isOpen) {
      try {
        const stored = localStorage.getItem("ai_api_keys");
        if (stored) setKeys(JSON.parse(stored));
      } catch (e) {}
    }
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem("ai_api_keys", JSON.stringify(keys));
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-[#39FF14] p-6 shadow-xl relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-neutral-400 hover:text-neutral-900 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold text-neutral-950">API Settings</h2>
        <p className="mt-2 text-sm text-neutral-500 mb-6">
          Enter your API keys to use the selected models. Keys are stored locally in your browser.
        </p>

        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-neutral-950">
            OpenAI API Key
            <input
              type="password"
              placeholder="sk-..."
              value={keys.openai}
              onChange={(e) => setKeys({ ...keys, openai: e.target.value })}
              className="w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 font-mono text-sm font-normal outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-neutral-950">
            Anthropic API Key
            <input
              type="password"
              placeholder="sk-ant-..."
              value={keys.anthropic}
              onChange={(e) => setKeys({ ...keys, anthropic: e.target.value })}
              className="w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 font-mono text-sm font-normal outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-neutral-950">
            Google Gemini API Key
            <input
              type="password"
              placeholder="AIza..."
              value={keys.google}
              onChange={(e) => setKeys({ ...keys, google: e.target.value })}
              className="w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 font-mono text-sm font-normal outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-neutral-950">
            xAI Grok API Key
            <input
              type="password"
              placeholder="xai-..."
              value={keys.xai}
              onChange={(e) => setKeys({ ...keys, xai: e.target.value })}
              className="w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 font-mono text-sm font-normal outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500"
            />
          </label>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-bold text-white hover:bg-neutral-800 transition-colors"
          >
            Save Keys
          </button>
        </div>
      </div>
    </div>
  );
}
