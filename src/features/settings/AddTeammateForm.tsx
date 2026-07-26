"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const ALL_ROLES = [
  { value: "OWNER", label: "Owner" },
  { value: "ADMIN", label: "Admin" },
  { value: "SALES_REP", label: "Sales Rep" },
  { value: "FIELD_TECH", label: "Field Tech" }
];

export function AddTeammateForm({ canGrantOwner }: { canGrantOwner: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "FIELD_TECH" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const roles = canGrantOwner ? ALL_ROLES : ALL_ROLES.filter((r) => r.value !== "OWNER");

  function update(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    setLoading(false);
    if (res.ok) {
      setOpen(false);
      setForm({ name: "", email: "", password: "", role: "FIELD_TECH" });
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Something went wrong.");
    }
  }

  if (!open) {
    return (
      <button className="btn-primary" onClick={() => setOpen(true)}>+ Add teammate</button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 space-y-3">
      <p className="text-sm font-medium text-white">New teammate</p>
      <div className="grid grid-cols-2 gap-3">
        <input className="input" placeholder="Full name" value={form.name} onChange={(e) => update("name", e.target.value)} required />
        <select className="input" value={form.role} onChange={(e) => update("role", e.target.value)}>
          {roles.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>
      <input className="input" placeholder="Email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required />
      <input className="input" placeholder="Temporary password (8+ characters)" type="password" minLength={8} value={form.password} onChange={(e) => update("password", e.target.value)} required />
      <p className="text-[11px] text-graphite-500">
        There's no email invite system yet — share this email and password with them directly so they can log in and change it themselves.
      </p>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary">{loading ? "Adding..." : "Add teammate"}</button>
      </div>
    </form>
  );
}
