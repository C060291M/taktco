"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type LineItem = { description: string; qty: number; unit: string; unitPrice: number };

export function NewEstimateForm({
  customers,
  defaultWarranty,
  defaultTerms
}: {
  customers: { id: string; name: string }[];
  defaultWarranty?: string | null;
  defaultTerms?: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [items, setItems] = useState<LineItem[]>([{ description: "", qty: 1, unit: "ea", unitPrice: 0 }]);
  const [warranty, setWarranty] = useState(defaultWarranty || "");
  const [terms, setTerms] = useState(defaultTerms || "");
  const [aiGenerated, setAiGenerated] = useState(false);

  const [aiMode, setAiMode] = useState(false);
  const [aiDescription, setAiDescription] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const total = items.reduce((sum, li) => sum + (li.qty || 0) * (li.unitPrice || 0), 0);

  function updateItem(i: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((li, idx) => (idx === i ? { ...li, ...patch } : li)));
  }

  function resetForm() {
    setItems([{ description: "", qty: 1, unit: "ea", unitPrice: 0 }]);
    setCustomerId("");
    setWarranty(defaultWarranty || "");
    setTerms(defaultTerms || "");
    setAiGenerated(false);
    setAiMode(false);
    setAiDescription("");
    setAiError(null);
  }

  async function generateWithAi() {
    if (!aiDescription.trim()) return;
    setAiLoading(true);
    setAiError(null);
    const res = await fetch("/api/estimates/ai-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: aiDescription })
    });
    const data = await res.json().catch(() => ({}));
    setAiLoading(false);
    if (res.ok) {
      setItems(data.lineItems?.length ? data.lineItems : items);
      setWarranty(data.warranty || "");
      setTerms(data.terms || "");
      setAiGenerated(true);
      setAiMode(false); // drop into the editable manual view with fields pre-filled
    } else {
      setAiError(data.error || "AI generation failed.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/estimates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId, lineItems: items, warranty, terms, aiGenerated })
    });
    setLoading(false);
    if (res.ok) {
      setOpen(false);
      resetForm();
      router.refresh();
    }
  }

  if (!open) {
    return (
      <button className="btn-primary" onClick={() => setOpen(true)} disabled={customers.length === 0}>
        + New estimate
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setOpen(false)}>
      <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()} className="card w-full max-w-lg p-6 space-y-3 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-medium">New estimate</h2>
          <button
            type="button"
            className={aiMode ? "btn-primary text-xs" : "btn-secondary text-xs"}
            onClick={() => setAiMode((m) => !m)}
          >
            ✨ AI Builder
          </button>
        </div>

        {aiMode ? (
          <div className="space-y-3">
            <p className="text-xs text-graphite-400">
              Describe the job in plain language — TAKTCO AI drafts the line items, warranty, and terms. You can edit everything before saving.
            </p>
            <textarea
              className="input"
              rows={3}
              placeholder="e.g. Replace 220 feet of 6-foot cedar privacy fence with two walk gates."
              value={aiDescription}
              onChange={(e) => setAiDescription(e.target.value)}
            />
            {aiError && <p className="text-xs text-red-400">{aiError}</p>}
            <button type="button" className="btn-primary w-full" disabled={aiLoading || !aiDescription.trim()} onClick={generateWithAi}>
              {aiLoading ? "Generating..." : "Generate draft"}
            </button>
          </div>
        ) : (
          <>
            {aiGenerated && (
              <p className="text-[11px] text-accent">✨ Drafted by TAKTCO AI — review everything below before sending.</p>
            )}
            <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
              <option value="">Select customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <div className="space-y-2">
              {items.map((li, i) => (
                <div key={i} className="grid grid-cols-12 gap-2">
                  <input
                    className="input col-span-5"
                    placeholder="Description"
                    value={li.description}
                    onChange={(e) => updateItem(i, { description: e.target.value })}
                    required
                  />
                  <input
                    className="input col-span-2"
                    type="number"
                    placeholder="Qty"
                    value={li.qty}
                    onChange={(e) => updateItem(i, { qty: Number(e.target.value) })}
                    required
                    min={0}
                  />
                  <input
                    className="input col-span-2"
                    placeholder="Unit"
                    value={li.unit}
                    onChange={(e) => updateItem(i, { unit: e.target.value })}
                  />
                  <input
                    className="input col-span-3"
                    type="number"
                    placeholder="Unit price"
                    value={li.unitPrice}
                    onChange={(e) => updateItem(i, { unitPrice: Number(e.target.value) })}
                    required
                    min={0}
                  />
                </div>
              ))}
            </div>
            <button
              type="button"
              className="text-xs text-accent hover:underline"
              onClick={() => setItems((prev) => [...prev, { description: "", qty: 1, unit: "ea", unitPrice: 0 }])}
            >
              + Add line item
            </button>

            <textarea className="input" placeholder="Warranty (optional)" rows={2} value={warranty} onChange={(e) => setWarranty(e.target.value)} />
            <textarea className="input" placeholder="Terms (optional)" rows={2} value={terms} onChange={(e) => setTerms(e.target.value)} />

            <div className="flex items-center justify-between pt-2 border-t border-graphite-700">
              <span className="text-graphite-300 text-sm">Total</span>
              <span className="text-white font-semibold">${total.toLocaleString()}</span>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
              <button type="submit" disabled={loading} className="btn-primary">{loading ? "Saving..." : "Save estimate"}</button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
