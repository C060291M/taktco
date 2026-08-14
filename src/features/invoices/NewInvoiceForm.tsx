"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type LineItem = { description: string; qty: number; unit: string; unitPrice: number };
type JobOption = { id: string; label: string };

export function NewInvoiceForm({
  customers,
  jobs,
  defaultDueDays,
  hasDepositPercent
}: {
  customers: { id: string; name: string }[];
  jobs: JobOption[];
  defaultDueDays?: number | null;
  hasDepositPercent?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [jobId, setJobId] = useState("");
  const [splitting, setSplitting] = useState(false);
  const [splitError, setSplitError] = useState<string | null>(null);
  const [items, setItems] = useState<LineItem[]>([{ description: "", qty: 1, unit: "ea", unitPrice: 0 }]);
  const [taxAmount, setTaxAmount] = useState("0");
  const [dueDate, setDueDate] = useState(() => {
    if (!defaultDueDays) return "";
    const d = new Date();
    d.setDate(d.getDate() + defaultDueDays);
    return d.toISOString().slice(0, 10);
  });
  const [pulling, setPulling] = useState(false);

  const subtotal = items.reduce((sum, li) => sum + (li.qty || 0) * (li.unitPrice || 0), 0);
  const total = subtotal + (Number(taxAmount) || 0);

  function updateItem(i: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((li, idx) => (idx === i ? { ...li, ...patch } : li)));
  }

  async function pullFromJob(id: string) {
    setJobId(id);
    if (!id) return;
    setPulling(true);
    const res = await fetch(`/api/jobs/${id}/estimate-items`);
    const data = await res.json().catch(() => ({}));
    setPulling(false);
    if (res.ok) {
      setCustomerId(data.customerId);
      if (data.lineItems?.length) setItems(data.lineItems);
    }
  }

  async function splitIntoDepositAndBalance() {
    if (!jobId) return;
    setSplitting(true);
    setSplitError(null);
    const res = await fetch(`/api/jobs/${jobId}/deposit-invoices`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setSplitting(false);
    if (res.ok) {
      setOpen(false);
      router.refresh();
    } else {
      setSplitError(data.error || "Could not split into deposit + balance.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId,
        jobId: jobId || undefined,
        lineItems: items,
        taxAmount: Number(taxAmount) || 0,
        dueDate: dueDate || undefined
      })
    });
    setLoading(false);
    if (res.ok) {
      setOpen(false);
      setItems([{ description: "", qty: 1, unit: "ea", unitPrice: 0 }]);
      setCustomerId("");
      setJobId("");
      setTaxAmount("0");
      setDueDate("");
      router.refresh();
    }
  }

  if (!open) {
    return (
      <button className="btn-primary" onClick={() => setOpen(true)} disabled={customers.length === 0}>
        + New invoice
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setOpen(false)}>
      <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()} className="card w-full max-w-lg p-6 space-y-3 max-h-[85vh] overflow-y-auto">
        <h2 className="text-white font-medium">New invoice</h2>

        {jobs.length > 0 && (
          <>
            <div>
              <label className="block text-xs text-graphite-300 mb-1">Pull from a job (optional)</label>
              <select className="input" value={jobId} onChange={(e) => pullFromJob(e.target.value)}>
                <option value="">Manual entry</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>{j.label}</option>
                ))}
              </select>
              {pulling && <p className="text-xs text-graphite-400 mt-1">Pulling line items...</p>}
            </div>
            {jobId && hasDepositPercent && (
              <div className="mt-2 p-3 rounded-lg border border-accent/30 bg-accent/5">
                <p className="text-xs text-graphite-300 mb-2">
                  This company has a default deposit % set - you can split this into two invoices instead of one.
                </p>
                <button type="button" className="btn-secondary text-xs" disabled={splitting} onClick={splitIntoDepositAndBalance}>
                  {splitting ? "Creating..." : "Split into deposit + final balance"}
                </button>
                {splitError && <p className="text-xs text-red-400 mt-1">{splitError}</p>}
              </div>
            )}
          </>
        )}

        <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)} required disabled={!!jobId}>
          <option value="">Select customer</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <div className="space-y-2">
          {items.map((li, i) => (
            <div key={i} className="grid grid-cols-12 gap-2">
              <input className="input col-span-5" placeholder="Description" value={li.description} onChange={(e) => updateItem(i, { description: e.target.value })} required />
              <input className="input col-span-2" type="number" placeholder="Qty" value={li.qty} onChange={(e) => updateItem(i, { qty: Number(e.target.value) })} required min={0} />
              <input className="input col-span-2" placeholder="Unit" value={li.unit} onChange={(e) => updateItem(i, { unit: e.target.value })} />
              <input className="input col-span-3" type="number" placeholder="Unit price" value={li.unitPrice} onChange={(e) => updateItem(i, { unitPrice: Number(e.target.value) })} required min={0} step={0.01} />
            </div>
          ))}
        </div>
        <button type="button" className="text-xs text-accent hover:underline" onClick={() => setItems((prev) => [...prev, { description: "", qty: 1, unit: "ea", unitPrice: 0 }])}>
          + Add line item
        </button>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-graphite-300 mb-1">Tax amount</label>
            <input className="input" type="number" value={taxAmount} onChange={(e) => setTaxAmount(e.target.value)} min={0} step={0.01} />
          </div>
          <div>
            <label className="block text-xs text-graphite-300 mb-1">Due date</label>
            <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-graphite-700">
          <span className="text-graphite-300 text-sm">Total</span>
          <span className="text-white font-semibold">${total.toLocaleString()}</span>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
          <button type="submit" disabled={loading || !customerId} className="btn-primary">{loading ? "Saving..." : "Save invoice"}</button>
        </div>
      </form>
    </div>
  );
}


