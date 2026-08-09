"use client";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/useToast";

const UNIT_PRESETS = [
  "Each", "Hour", "Day", "Week", "Month", "Linear Foot", "Square Foot",
  "Square Yard", "Cubic Yard", "Ton", "Pound", "Bag", "Roll", "Panel",
  "Gate", "Room", "Fixture", "Piece", "Truckload", "Service Call", "Visit", "Project"
];

export type EditableItem = {
  id?: string;
  name: string;
  description?: string | null;
  unit: string;
  price: number;
  cost?: number | null;
  markupPercent?: number | null;
  minCharge?: number | null;
  maxCharge?: number | null;
  taxable?: boolean;
  notes?: string | null;
};

function DollarInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-graphite-500 text-sm pointer-events-none">$</span>
      <input
        className="input pl-6"
        type="number"
        step="0.01"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function ItemFormModal({
  mode, categoryId, parentItemId, parentItemName, initial, onClose, onSaved
}: {
  mode: "create" | "add-on" | "edit";
  categoryId?: string;
  parentItemId?: string;
  parentItemName?: string;
  initial?: EditableItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState({
    name: initial?.name || "",
    description: initial?.description || "",
    unit: initial && !UNIT_PRESETS.includes(initial.unit) ? "Custom..." : (initial?.unit || "Each"),
    customUnit: initial && !UNIT_PRESETS.includes(initial.unit) ? initial.unit : "",
    price: initial?.price?.toString() ?? "0",
    cost: initial?.cost?.toString() ?? "",
    markupPercent: initial?.markupPercent?.toString() ?? "",
    minCharge: initial?.minCharge?.toString() ?? "",
    maxCharge: initial?.maxCharge?.toString() ?? "",
    taxable: initial?.taxable ?? true,
    notes: initial?.notes || ""
  });
  const [saving, setSaving] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function recalcPrice(cost: string, markupPercent: string) {
    const costNum = Number(cost);
    const markup = Number(markupPercent) || 0;
    if (cost && costNum > 0) {
      return (costNum * (1 + markup / 100)).toFixed(2);
    }
    return null;
  }

  function updateAndRecalcPrice(key: "cost" | "markupPercent", value: string) {
    setForm((f) => {
      const next = { ...f, [key]: value };
      const recalculated = recalcPrice(next.cost, next.markupPercent);
      if (recalculated !== null) next.price = recalculated;
      return next;
    });
  }

  // Opening an existing item that has a saved Cost but a stale/zero Price
  // (e.g. saved before this auto-calculate feature existed) fixes itself
  // immediately on open, instead of requiring you to retype into Cost or
  // Markup just to trigger a recalculation.
  useEffect(() => {
    if (initial?.cost) {
      const recalculated = recalcPrice(initial.cost.toString(), initial.markupPercent?.toString() || "");
      if (recalculated !== null) {
        setForm((f) => ({ ...f, price: recalculated }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    if (!form.name.trim()) { toast.error("Name is required."); return; }
    const unit = form.unit === "Custom..." ? form.customUnit.trim() : form.unit;
    if (!unit) { toast.error("Enter a custom unit."); return; }

    const payload = {
      name: form.name,
      description: form.description || undefined,
      unit,
      price: Number(form.price) || 0,
      cost: form.cost ? Number(form.cost) : undefined,
      markupPercent: form.markupPercent ? Number(form.markupPercent) : undefined,
      minCharge: form.minCharge ? Number(form.minCharge) : undefined,
      maxCharge: form.maxCharge ? Number(form.maxCharge) : undefined,
      taxable: form.taxable,
      notes: form.notes || undefined
    };

    setSaving(true);
    const res = mode === "edit"
      ? await fetch(`/api/pricing/items/${initial!.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      : await fetch("/api/pricing/items", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, categoryId, parentItemId: mode === "add-on" ? parentItemId : undefined })
        });
    setSaving(false);

    if (res.ok) {
      toast.success(mode === "edit" ? "Item updated" : mode === "add-on" ? "Add-on created" : "Item added");
      onSaved();
      onClose();
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Couldn't save.");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="card w-full max-w-md p-5 space-y-3 max-h-[85vh] overflow-y-auto">
        <h2 className="text-white font-medium text-sm">
          {mode === "edit" ? "Edit item" : mode === "add-on" ? `Add-on for "${parentItemName}"` : "Add item"}
        </h2>

        <input className="input" placeholder="Item name" value={form.name} onChange={(e) => update("name", e.target.value)} />
        <input className="input" placeholder="Description (optional)" value={form.description} onChange={(e) => update("description", e.target.value)} />

        <div className="grid grid-cols-2 gap-2">
          <select className="input" value={form.unit} onChange={(e) => update("unit", e.target.value)}>
            {UNIT_PRESETS.map((u) => <option key={u} value={u}>{u}</option>)}
            <option value="Custom...">Custom...</option>
          </select>
          {form.unit === "Custom..." ? (
            <input className="input" placeholder="Custom unit" value={form.customUnit} onChange={(e) => update("customUnit", e.target.value)} />
          ) : (
            <DollarInput value={form.price} onChange={(v) => update("price", v)} placeholder="Price" />
          )}
        </div>
        {form.unit === "Custom..." && (
          <DollarInput value={form.price} onChange={(v) => update("price", v)} placeholder="Price" />
        )}

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] text-graphite-400 mb-1">Cost (optional)</label>
            <DollarInput value={form.cost} onChange={(v) => updateAndRecalcPrice("cost", v)} />
          </div>
          <div>
            <label className="block text-[11px] text-graphite-400 mb-1">Markup %</label>
            <input className="input" type="number" step="0.01" value={form.markupPercent} onChange={(e) => updateAndRecalcPrice("markupPercent", e.target.value)} />
          </div>
          <div>
            <label className="block text-[11px] text-graphite-400 mb-1">Min charge</label>
            <DollarInput value={form.minCharge} onChange={(v) => update("minCharge", v)} />
          </div>
          <div>
            <label className="block text-[11px] text-graphite-400 mb-1">Max charge</label>
            <DollarInput value={form.maxCharge} onChange={(v) => update("maxCharge", v)} />
          </div>
        </div>

        <label className="flex items-center gap-2 text-xs text-graphite-300">
          <input type="checkbox" checked={form.taxable} onChange={(e) => update("taxable", e.target.checked)} />
          Taxable
        </label>

        <textarea className="input text-xs" rows={2} placeholder="Notes (optional)" value={form.notes} onChange={(e) => update("notes", e.target.value)} />

        <div className="flex gap-2 justify-end pt-1">
          <button className="btn-secondary text-xs" onClick={onClose}>Cancel</button>
          <button className="btn-primary text-xs" disabled={saving} onClick={save}>{saving ? "Saving..." : "Save"}</button>
        </div>
      </div>
    </div>
  );
}
