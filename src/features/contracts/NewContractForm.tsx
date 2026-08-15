"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DocumentDropzone } from "@/components/forms/DocumentDropzone";
import { LegalDisclaimer } from "@/components/layout/LegalDisclaimer";
import { CONTRACT_TYPES } from "@/lib/contractTemplates";

export function NewContractForm({ customers, companyName, defaultCustomerId }: { customers: { id: string; name: string }[]; companyName: string; defaultCustomerId?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"template" | "ai" | "upload">("template");
  const [customerId, setCustomerId] = useState(defaultCustomerId || "");
  const [type, setType] = useState(CONTRACT_TYPES[0].value);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [aiDescription, setAiDescription] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiGenerated, setAiGenerated] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedCustomerName = customers.find((c) => c.id === customerId)?.name || "[Client name]";

  // Re-fill the template body whenever type or customer changes, but only if the
  // user hasn't started editing yet (avoid clobbering their edits on every keystroke
  // elsewhere) - simplest way is to only auto-fill when content is still empty or
  // still matches the previous auto-fill, tracked via a "dirty" flag.
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (mode !== "template" || dirty) return;
    import("@/lib/contractTemplates").then(({ getContractTemplate }) => {
      setContent(getContractTemplate(type, companyName, selectedCustomerName));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, selectedCustomerName, mode]);

  async function generateContractDraft() {
    if (!aiDescription.trim()) return;
    setAiLoading(true);
    setAiError(null);
    const res = await fetch("/api/contracts/ai-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: aiDescription, contractType: CONTRACT_TYPES.find((t) => t.value === type)?.label || type })
    });
    const data = await res.json().catch(() => ({}));
    setAiLoading(false);
    if (res.ok) {
      setContent(data.content || "");
      setAiGenerated(true);
      setDirty(true); // don't let the template auto-fill effect clobber the AI draft
    } else if (data.error === "INSUFFICIENT_CREDITS") {
      setAiError("Not enough AI credits for this. Check Settings -> TAKTCO AI.");
    } else {
      setAiError(data.error || "AI draft failed.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/contracts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId,
        type,
        title: title || CONTRACT_TYPES.find((t) => t.value === type)?.label,
        content: mode === "template" || mode === "ai" ? content : undefined,
        fileUrl: mode === "upload" ? fileUrl || undefined : undefined,
        fileName: mode === "upload" ? fileName || undefined : undefined
      })
    });
    setLoading(false);
    if (res.ok) {
      setOpen(false);
      setTitle("");
      setContent("");
      setFileUrl(null);
      setFileName(null);
      setDirty(false);
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Something went wrong.");
    }
  }

  if (!open) {
    return (
      <button className="btn-primary" onClick={() => setOpen(true)} disabled={customers.length === 0}>
        + New contract
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setOpen(false)}>
      <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()} className="card w-full max-w-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
        <h2 className="text-white font-medium">New contract</h2>

        <div className="flex gap-2">
          <button type="button" onClick={() => setMode("template")} className={mode === "template" ? "btn-primary text-sm" : "btn-secondary text-sm"}>
            Fill in a template
          </button>
          <button type="button" onClick={() => setMode("ai")} className={mode === "ai" ? "btn-primary text-sm" : "btn-secondary text-sm"}>
            ✨ AI draft
          </button>
          <button type="button" onClick={() => setMode("upload")} className={mode === "upload" ? "btn-primary text-sm" : "btn-secondary text-sm"}>
            Upload my own
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
            <option value="">Select customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {mode === "template" || mode === "ai" ? (
            <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
              {CONTRACT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          ) : (
            <input className="input" placeholder="Title (e.g. Signed Service Agreement)" value={title} onChange={(e) => setTitle(e.target.value)} />
          )}
        </div>

        {mode === "ai" && (
          <div className="space-y-2 border border-graphite-700 rounded-lg p-3">
            <label className="block text-xs text-graphite-300">Describe the job in plain language</label>
            <textarea
              className="input text-xs"
              rows={3}
              placeholder="e.g. Install 180 feet of cedar privacy fence with one walk gate, remove existing chain link fence"
              value={aiDescription}
              onChange={(e) => setAiDescription(e.target.value)}
            />
            {aiError && <p className="text-xs text-red-400">{aiError}</p>}
            <button type="button" className="btn-secondary text-xs" disabled={aiLoading} onClick={generateContractDraft}>
              {aiLoading ? "Drafting..." : aiGenerated ? "Regenerate" : "Generate contract draft"}
            </button>
            {aiGenerated && <p className="text-[11px] text-accent">✨ Drafted below — review and edit before saving.</p>}
          </div>
        )}

        {mode === "template" || (mode === "ai" && content) ? (
          <div>
            <label className="block text-xs text-graphite-300 mb-1">
              Contract text — edit anything in [brackets], or rewrite freely
            </label>
            <textarea
              className="input font-mono text-xs leading-relaxed"
              rows={14}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setDirty(true);
              }}
            />
          </div>
        ) : mode === "upload" ? (
          <DocumentDropzone onChange={(dataUrl, name) => { setFileUrl(dataUrl); setFileName(name); }} />
        ) : null}

        <LegalDisclaimer compact />

        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex gap-2 justify-end pt-2">
          <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
          <button type="submit" disabled={loading || (mode === "ai" && !content)} className="btn-primary">{loading ? "Saving..." : "Save contract"}</button>
        </div>
      </form>
    </div>
  );
}

