"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type CustomerOption = { id: string; name: string; email: string | null; phone: string | null };

export function NewCampaignForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", channel: "EMAIL", audience: "ALL_CUSTOMERS", subject: "", message: "" });
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  function update(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function selectAudience(value: string) {
    update("audience", value);
    if (value === "SPECIFIC_CUSTOMERS" && customers.length === 0) {
      setLoadingCustomers(true);
      const res = await fetch("/api/customers");
      if (res.ok) setCustomers(await res.json());
      setLoadingCustomers(false);
    }
  }

  function toggleCustomer(id: string) {
    setSelectedCustomerIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        recipientCustomerIds: form.audience === "SPECIFIC_CUSTOMERS" ? Array.from(selectedCustomerIds) : undefined
      })
    });
    setLoading(false);
    if (res.ok) {
      setOpen(false);
      setForm({ name: "", channel: "EMAIL", audience: "ALL_CUSTOMERS", subject: "", message: "" });
      setSelectedCustomerIds(new Set());
      router.refresh();
    }
  }

  if (!open) {
    return <button className="btn-primary" onClick={() => setOpen(true)}>+ New campaign</button>;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setOpen(false)}>
      <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()} className="card w-full max-w-md p-6 space-y-3 max-h-[85vh] overflow-y-auto">
        <h2 className="text-white font-medium">New campaign</h2>
        <input className="input" placeholder="Campaign name" value={form.name} onChange={(e) => update("name", e.target.value)} required />
        <select className="input" value={form.channel} onChange={(e) => update("channel", e.target.value)}>
          <option value="EMAIL">Email</option>
          <option value="SMS">SMS</option>
        </select>
        <select className="input" value={form.audience} onChange={(e) => selectAudience(e.target.value)}>
          <option value="ALL_CUSTOMERS">All customers</option>
          <option value="ACTIVE_LEADS">Active leads only</option>
          <option value="PAST_CUSTOMERS">Past customers (completed jobs)</option>
          <option value="SPECIFIC_CUSTOMERS">Specific customers (pick individually)</option>
        </select>

        {form.audience === "SPECIFIC_CUSTOMERS" && (
          <div className="border border-graphite-700 rounded-lg p-2 max-h-48 overflow-y-auto space-y-1">
            {loadingCustomers && <p className="text-xs text-graphite-500">Loading customers...</p>}
            {!loadingCustomers && customers.length === 0 && <p className="text-xs text-graphite-500">No customers yet.</p>}
            {customers.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-xs text-graphite-200">
                <input type="checkbox" checked={selectedCustomerIds.has(c.id)} onChange={() => toggleCustomer(c.id)} />
                {c.name} <span className="text-graphite-500">({c.email || c.phone || "no contact info"})</span>
              </label>
            ))}
            {customers.length > 0 && (
              <p className="text-[11px] text-graphite-500 pt-1">{selectedCustomerIds.size} selected</p>
            )}
          </div>
        )}

        {form.channel === "EMAIL" && (
          <input className="input" placeholder="Subject line" value={form.subject} onChange={(e) => update("subject", e.target.value)} />
        )}
        <textarea
          className="input"
          rows={5}
          placeholder="Message"
          value={form.message}
          onChange={(e) => update("message", e.target.value)}
          required
        />
        <div className="flex gap-2 justify-end pt-2">
          <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
          <button
            type="submit"
            disabled={loading || (form.audience === "SPECIFIC_CUSTOMERS" && selectedCustomerIds.size === 0)}
            className="btn-primary"
          >
            {loading ? "Saving..." : "Save as draft"}
          </button>
        </div>
      </form>
    </div>
  );
}
