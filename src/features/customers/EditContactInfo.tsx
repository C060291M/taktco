"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/useToast";
import { Pencil } from "lucide-react";

export function EditContactInfo({
  customerId, name, email, phone, address
}: { customerId: string; name: string; email: string | null; phone: string | null; address: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name, email: email || "", phone: phone || "", address: address || "" });

  async function save() {
    if (!form.name.trim()) { toast.error("Name is required."); return; }
    setSaving(true);
    const res = await fetch(`/api/customers/${customerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Contact info updated");
      setEditing(false);
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Couldn't save changes.");
    }
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-graphite-500 hover:text-white flex items-center gap-1 text-xs"
        title="Edit contact info"
      >
        <Pencil size={13} /> Edit
      </button>
    );
  }

  return (
    <div className="card p-4 space-y-2 w-full max-w-md">
      <div>
        <label className="block text-xs text-graphite-300 mb-1">Name</label>
        <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
      </div>
      <div>
        <label className="block text-xs text-graphite-300 mb-1">Email</label>
        <input className="input" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
      </div>
      <div>
        <label className="block text-xs text-graphite-300 mb-1">Phone</label>
        <input className="input" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
      </div>
      <div>
        <label className="block text-xs text-graphite-300 mb-1">Address</label>
        <input className="input" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
      </div>
      <div className="flex gap-2 pt-1">
        <button className="btn-primary text-xs" disabled={saving} onClick={save}>{saving ? "Saving..." : "Save"}</button>
        <button className="btn-secondary text-xs" onClick={() => { setEditing(false); setForm({ name, email: email || "", phone: phone || "", address: address || "" }); }}>Cancel</button>
      </div>
    </div>
  );
}
