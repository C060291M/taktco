"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/useToast";

type Defaults = {
  defaultMarkupPercent: number | null;
  defaultLaborRate: number | null;
  defaultWarrantyText: string | null;
  defaultEstimateTerms: string | null;
  estimateExpirationEnabled: boolean;
  defaultEstimateValidDays: number;
};

export function EstimateDefaultsForm({ initial }: { initial: Defaults }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState({
    markup: initial.defaultMarkupPercent?.toString() || "",
    laborRate: initial.defaultLaborRate?.toString() || "",
    warranty: initial.defaultWarrantyText || "",
    terms: initial.defaultEstimateTerms || "",
    expirationEnabled: initial.estimateExpirationEnabled,
    validDays: initial.defaultEstimateValidDays.toString()
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const res = await fetch("/api/company/defaults", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        defaultMarkupPercent: form.markup ? Number(form.markup) : null,
        defaultLaborRate: form.laborRate ? Number(form.laborRate) : null,
        defaultWarrantyText: form.warranty || null,
        defaultEstimateTerms: form.terms || null,
        estimateExpirationEnabled: form.expirationEnabled,
        defaultEstimateValidDays: form.validDays ? Number(form.validDays) : 30
      })
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Estimate defaults saved");
      router.refresh();
    } else {
      toast.error("Couldn't save. Try again.");
    }
  }

  return (
    <div className="card p-5 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-graphite-300 mb-1">Default markup %</label>
          <input className="input" type="number" value={form.markup} onChange={(e) => setForm((f) => ({ ...f, markup: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs text-graphite-300 mb-1">Default labor rate ($/hr)</label>
          <input className="input" type="number" value={form.laborRate} onChange={(e) => setForm((f) => ({ ...f, laborRate: e.target.value }))} />
        </div>
      </div>
      <div>
        <label className="block text-xs text-graphite-300 mb-1">Default warranty text</label>
        <textarea className="input" rows={2} value={form.warranty} onChange={(e) => setForm((f) => ({ ...f, warranty: e.target.value }))} />
      </div>
      <div>
        <label className="block text-xs text-graphite-300 mb-1">Default terms</label>
        <textarea className="input" rows={2} value={form.terms} onChange={(e) => setForm((f) => ({ ...f, terms: e.target.value }))} />
      </div>

      <div className="border-t border-graphite-700 pt-3 space-y-2">
        <label className="flex items-center gap-2 text-xs text-graphite-300">
          <input
            type="checkbox"
            checked={form.expirationEnabled}
            onChange={(e) => setForm((f) => ({ ...f, expirationEnabled: e.target.checked }))}
          />
          Automatically set an expiration on new estimates
        </label>
        {form.expirationEnabled && (
          <div className="flex items-center gap-2 pl-6">
            <span className="text-xs text-graphite-400">Valid for</span>
            <input
              className="input w-20"
              type="number"
              min={1}
              value={form.validDays}
              onChange={(e) => setForm((f) => ({ ...f, validDays: e.target.value }))}
            />
            <span className="text-xs text-graphite-400">days</span>
          </div>
        )}
      </div>

      <p className="text-[11px] text-graphite-500">These pre-fill new estimates - you can still edit them per estimate before sending.</p>
      <button className="btn-primary" disabled={saving} onClick={save}>{saving ? "Saving..." : "Save"}</button>
    </div>
  );
}
