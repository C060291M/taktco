"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewCustomerForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", source: "" });

  function update(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    setLoading(false);
    if (res.ok) {
      setOpen(false);
      setForm({ name: "", phone: "", email: "", address: "", source: "" });
      router.refresh();
    }
  }

  if (!open) {
    return (
      <button className="btn-primary" onClick={() => setOpen(true)}>
        + Add customer
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setOpen(false)}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="card w-full max-w-md p-6 space-y-3"
      >
        <h2 className="text-white font-medium mb-2">New customer</h2>
        <input className="input" placeholder="Full name" value={form.name} onChange={(e) => update("name", e.target.value)} required />
        <input className="input" placeholder="Phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
        <input className="input" placeholder="Email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
        <input className="input" placeholder="Address" value={form.address} onChange={(e) => update("address", e.target.value)} />
        <input className="input" placeholder="Source (e.g. Referral, Website)" value={form.source} onChange={(e) => update("source", e.target.value)} />
        <div className="flex gap-2 justify-end pt-2">
          <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">{loading ? "Saving..." : "Save customer"}</button>
        </div>
      </form>
    </div>
  );
}
