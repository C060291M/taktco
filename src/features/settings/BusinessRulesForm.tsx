"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/useToast";

type Rules = {
  minJobPrice: number | null;
  targetMarginPercent: number | null;
  mobilizationFee: number | null;
  fuelCharge: number | null;
  travelCharge: number | null;
  warrantyLengthMonths: number | null;
};

// Fed directly into the AI Estimate Builder's prompt alongside the Pricing
// Matrix (see lib/pricingMatrix.ts formatBusinessRules) - not just stored
// for display. Deliberately a small, real set - not a full rate-multiplier
// engine (no commercial/residential/overtime/emergency rates).
export function BusinessRulesForm({ initial }: { initial: Rules }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState({
    minJobPrice: initial.minJobPrice?.toString() || "",
    targetMarginPercent: initial.targetMarginPercent?.toString() || "",
    mobilizationFee: initial.mobilizationFee?.toString() || "",
    fuelCharge: initial.fuelCharge?.toString() || "",
    travelCharge: initial.travelCharge?.toString() || "",
    warrantyLengthMonths: initial.warrantyLengthMonths?.toString() || ""
  });
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function save() {
    setSaving(true);
    const res = await fetch("/api/company/defaults", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        minJobPrice: form.minJobPrice ? Number(form.minJobPrice) : null,
        targetMarginPercent: form.targetMarginPercent ? Number(form.targetMarginPercent) : null,
        mobilizationFee: form.mobilizationFee ? Number(form.mobilizationFee) : null,
        fuelCharge: form.fuelCharge ? Number(form.fuelCharge) : null,
        travelCharge: form.travelCharge ? Number(form.travelCharge) : null,
        warrantyLengthMonths: form.warrantyLengthMonths ? Number(form.warrantyLengthMonths) : null
      })
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Business rules saved");
      router.refresh();
    } else {
      toast.error("Couldn't save. Try again.");
    }
  }

  return (
    <div className="card p-5">
      <button className="w-full flex items-center justify-between text-left" onClick={() => setExpanded((e) => !e)}>
        <div>
          <h2 className="text-sm font-medium text-white">Business rules</h2>
          <p className="text-xs text-graphite-500">Fed into every AI-generated estimate — minimums, margins, standard fees.</p>
        </div>
        <span className="text-graphite-500 text-xs">{expanded ? "Hide" : "Edit"}</span>
      </button>
      {expanded && (
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div>
            <label className="block text-xs text-graphite-300 mb-1">Minimum job price ($)</label>
            <input className="input" type="number" value={form.minJobPrice} onChange={(e) => setForm((f) => ({ ...f, minJobPrice: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs text-graphite-300 mb-1">Target gross margin (%)</label>
            <input className="input" type="number" value={form.targetMarginPercent} onChange={(e) => setForm((f) => ({ ...f, targetMarginPercent: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs text-graphite-300 mb-1">Mobilization fee ($)</label>
            <input className="input" type="number" value={form.mobilizationFee} onChange={(e) => setForm((f) => ({ ...f, mobilizationFee: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs text-graphite-300 mb-1">Fuel charge ($)</label>
            <input className="input" type="number" value={form.fuelCharge} onChange={(e) => setForm((f) => ({ ...f, fuelCharge: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs text-graphite-300 mb-1">Travel charge ($)</label>
            <input className="input" type="number" value={form.travelCharge} onChange={(e) => setForm((f) => ({ ...f, travelCharge: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs text-graphite-300 mb-1">Warranty length (months)</label>
            <input className="input" type="number" value={form.warrantyLengthMonths} onChange={(e) => setForm((f) => ({ ...f, warrantyLengthMonths: e.target.value }))} />
          </div>
          <button className="btn-primary col-span-2" disabled={saving} onClick={save}>{saving ? "Saving..." : "Save business rules"}</button>
        </div>
      )}
    </div>
  );
}
