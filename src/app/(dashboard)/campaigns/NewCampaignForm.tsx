"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewCampaignForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", channel: "EMAIL", subject: "", message: "" });

  function update(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    setLoading(false);
    if (res.ok) {
      setOpen(false);
      setForm({ name: "", channel: "EMAIL", subject: "", message: "" });
      router.refresh();
    }
  }

  if (!open) {
    return <button className="btn-primary" onClick={() => setOpen(true)}>+ New campaign</button>;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setOpen(false)}>
      <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()} className="card w-full max-w-md p-6 space-y-3">
        <h2 className="text-white font-medium">New campaign</h2>
        <input className="input" placeholder="Campaign name" value={form.name} onChange={(e) => update("name", e.target.value)} required />
        <select className="input" value={form.channel} onChange={(e) => update("channel", e.target.value)}>
          <option value="EMAIL">Email</option>
          <option value="SMS">SMS</option>
        </select>
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
          <button type="submit" disabled={loading} className="btn-primary">{loading ? "Saving..." : "Save as draft"}</button>
        </div>
      </form>
    </div>
  );
}
