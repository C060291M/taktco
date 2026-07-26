"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DocumentDropzone } from "@/components/forms/DocumentDropzone";
import { LegalDisclaimer } from "@/components/layout/LegalDisclaimer";
import { CONTRACT_TYPES } from "@/lib/contractTemplates";

export function NewContractForm({ customers, companyName }: { customers: { id: string; name: string }[]; companyName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"template" | "upload">("template");
  const [customerId, setCustomerId] = useState("");
  const [type, setType] = useState(CONTRACT_TYPES[0].value);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
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
        content: mode === "template" ? content : undefined,
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
          {mode === "template" ? (
            <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
              {CONTRACT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          ) : (
            <input className="input" placeholder="Title (e.g. Signed Service Agreement)" value={title} onChange={(e) => setTitle(e.target.value)} />
          )}
        </div>

        {mode === "template" ? (
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
        ) : (
          <DocumentDropzone onChange={(dataUrl, name) => { setFileUrl(dataUrl); setFileName(name); }} />
        )}

        <LegalDisclaimer compact />

        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex gap-2 justify-end pt-2">
          <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">{loading ? "Saving..." : "Save contract"}</button>
        </div>
      </form>
    </div>
  );
}
