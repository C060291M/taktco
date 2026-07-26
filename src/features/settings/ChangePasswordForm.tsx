"use client";
import { useState } from "react";
import { useToast } from "@/hooks/useToast";

export function ChangePasswordForm() {
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/users/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: next })
    });
    setSaving(false);
    if (res.ok) {
      setCurrent("");
      setNext("");
      toast.success("Password changed");
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Couldn't change password.");
    }
  }

  return (
    <form onSubmit={save} className="card p-5 space-y-3">
      <h2 className="text-sm font-medium text-white mb-1">Change password</h2>
      <input className="input" type="password" placeholder="Current password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
      <input className="input" type="password" placeholder="New password (8+ characters)" minLength={8} value={next} onChange={(e) => setNext(e.target.value)} required />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving..." : "Change password"}</button>
    </form>
  );
}
