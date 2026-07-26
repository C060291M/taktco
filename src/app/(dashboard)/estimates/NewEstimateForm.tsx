"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type LineItem = { description: string; qty: number; unit: string; unitPrice: number };

export function NewEstimateForm({ customers }: { customers: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [items, setItems] = useState<LineItem[]>([{ description: "", qty: 1, unit: "ea", unitPrice: 0 }]);

  const total = items.reduce((sum, li) => sum + (li.qty || 0) * (li.unitPrice || 0), 0);

  function updateItem(i: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((li, idx) => (idx === i ? { ...li, ...patch } : li)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/estimates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId, lineItems: items })
    });
    setLoading(false);
    if (res.ok) {
      setOpen(false);
      setItems([{ description: "", qty: 1, unit: "ea", unitPrice: 0 }]);
      setCustomerId("");
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
        <h2 className="text-white font-medium">New estimate</h2>
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

        <div className="flex items-center justify-between pt-2 border-t border-graphite-700">
          <span className="text-graphite-300 text-sm">Total</span>
          <span className="text-white font-semibold">${total.toLocaleString()}</span>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">{loading ? "Saving..." : "Save estimate"}</button>
        </div>
      </form>
    </div>
  );
}
