"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function ExpensesEditor({ initialCents }: { initialCents: number }) {
  const router = useRouter();
  const [value, setValue] = useState((initialCents / 100).toString());
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const cents = Math.round(Number(value) * 100);
    await fetch("/api/admin/finance", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monthlyExpensesCents: cents })
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-graphite-400 shrink-0">Monthly expenses ($)</label>
      <input className="input text-xs" type="number" min={0} value={value} onChange={(e) => setValue(e.target.value)} />
      <button className="btn-secondary text-xs shrink-0" disabled={saving} onClick={save}>{saving ? "..." : "Save"}</button>
    </div>
  );
}
