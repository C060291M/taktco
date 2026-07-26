"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";

const PROVIDERS = [
  { value: "ANTHROPIC", label: "Anthropic (Claude)" },
  { value: "OPENAI", label: "OpenAI" },
  { value: "GOOGLE_GEMINI", label: "Google Gemini" },
  { value: "XAI", label: "xAI (Grok)" },
  { value: "AZURE_OPENAI", label: "Azure OpenAI" }
];

type Wallet = { includedCredits: number; purchasedCredits: number; usedThisCycle: number; cycleResetAt: string } | null;

export function AiSettingsPanel({
  initial,
  wallet,
  isOwnerOrAdmin
}: {
  initial: { mode: string; byoaiProvider: string | null; connectionStatus: string; hasKeyStored: boolean };
  wallet: Wallet;
  isOwnerOrAdmin: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState(initial.mode);
  const [provider, setProvider] = useState(initial.byoaiProvider || "ANTHROPIC");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState(initial.connectionStatus);
  const [message, setMessage] = useState<string | null>(null);

  const remaining = wallet ? wallet.includedCredits - wallet.usedThisCycle + wallet.purchasedCredits : 500;
  const total = wallet ? wallet.includedCredits + wallet.purchasedCredits : 500;

  async function save() {
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/ai-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, byoaiProvider: mode === "BYOAI" ? provider : undefined, byoaiModel: model || undefined, apiKey: apiKey || undefined })
    });
    setSaving(false);
    if (res.ok) {
      setApiKey("");
      setMessage("Saved.");
      router.refresh();
    } else {
      setMessage("Couldn't save. Try again.");
    }
  }

  async function testConnection() {
    setTesting(true);
    const res = await fetch("/api/ai-settings/test-connection", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setTesting(false);
    setStatus(res.ok ? "connected" : "failed");
    setMessage(res.ok ? "Connection works." : data.error || "Connection failed.");
  }

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <h2 className="text-sm font-medium text-white mb-3">TAKTCO Credits</h2>
        <div className="flex items-end justify-between mb-2">
          <span className="text-2xl font-semibold text-white">{remaining.toLocaleString()}</span>
          <span className="text-xs text-graphite-400">of {total.toLocaleString()} remaining</span>
        </div>
        <div className="h-2 bg-graphite-700 rounded-full overflow-hidden">
          <div className="h-full bg-accent" style={{ width: `${total > 0 ? Math.min(100, (remaining / total) * 100) : 0}%` }} />
        </div>
        {wallet?.cycleResetAt && (
          <p className="text-xs text-graphite-500 mt-2">Resets {new Date(wallet.cycleResetAt).toLocaleDateString()}</p>
        )}
        <a href="/settings/ai/credits" className="text-xs text-accent hover:underline mt-3 inline-block">Buy more credits</a>
      </div>

      <div className="card p-5 space-y-3">
        <h2 className="text-sm font-medium text-white">AI provider</h2>
        <div className="flex gap-3">
          <label className="flex items-center gap-2 text-sm text-graphite-200">
            <input type="radio" checked={mode === "NOVA_AI"} onChange={() => setMode("NOVA_AI")} disabled={!isOwnerOrAdmin} />
            TAKTCO AI (included)
          </label>
          <label className="flex items-center gap-2 text-sm text-graphite-200">
            <input type="radio" checked={mode === "BYOAI"} onChange={() => setMode("BYOAI")} disabled={!isOwnerOrAdmin} />
            Connect my own AI
          </label>
        </div>

        {mode === "BYOAI" && (
          <div className="space-y-2 pt-2 border-t border-graphite-700">
            <select className="input" value={provider} onChange={(e) => setProvider(e.target.value)} disabled={!isOwnerOrAdmin}>
              {PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            <input className="input" placeholder="Model (optional, e.g. gpt-4o)" value={model} onChange={(e) => setModel(e.target.value)} disabled={!isOwnerOrAdmin} />
            <input
              className="input"
              type="password"
              placeholder={initial.hasKeyStored ? "Key saved — enter a new one to replace it" : "API key"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={!isOwnerOrAdmin}
            />
            <div className="flex items-center gap-2">
              <Badge color={status === "connected" ? "green" : status === "failed" ? "red" : "gray"}>{status}</Badge>
              {initial.hasKeyStored && (
                <button type="button" className="btn-secondary text-xs" disabled={testing} onClick={testConnection}>
                  {testing ? "Testing..." : "Test connection"}
                </button>
              )}
            </div>
            <p className="text-[11px] text-graphite-500">
              Your key is encrypted before storage (AES-256-GCM) and never shown back to you in full. In this mode, AI requests don't use your TAKTCO Credits — you're billed directly by your provider.
            </p>
          </div>
        )}

        {isOwnerOrAdmin && (
          <button className="btn-primary" disabled={saving} onClick={save}>{saving ? "Saving..." : "Save"}</button>
        )}
        {message && <p className="text-xs text-graphite-400">{message}</p>}
      </div>
    </div>
  );
}
