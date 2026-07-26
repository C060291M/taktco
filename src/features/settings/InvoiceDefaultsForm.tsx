"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/useToast";

type Defaults = {
  defaultInvoiceDueDays: number | null;
  defaultLateFeePercent: number | null;
  defaultDepositPercent: number | null;
  invoiceFooterText: string | null;
};

export function InvoiceDefaultsForm({ initial }: { initial: Defaults }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState({
    dueDays: initial.defaultInvoiceDueDays?.toString() || "14",
    lateFee: initial.defaultLateFeePercent?.toString() || "",
    deposit: initial.defaultDepositPercent?.toString() || "",
    footer: initial.invoiceFooterText || ""
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const res = await fetch("/api/company/defaults", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        defaultInvoiceDueDays: form.dueDays ? Number(form.dueDays) : null,
        defaultLateFeePercent: form.lateFee ? Number(form.lateFee) : null,
        defaultDepositPercent: form.deposit ? Number(form.deposit) : null,
        invoiceFooterText: form.footer || null
      })
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Invoice defaults saved");
      router.refresh();
    } else {
      toast.error("Couldn't save. Try again.");
    }
  }

  return (
    <div className="card p-5 space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-graphite-300 mb-1">Due in (days)</label>
          <input className="input" type="number" value={form.dueDays} onChange={(e) => setForm((f) => ({ ...f, dueDays: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs text-graphite-300 mb-1">Late fee %</label>
          <input className="input" type="number" value={form.lateFee} onChange={(e) => setForm((f) => ({ ...f, lateFee: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs text-graphite-300 mb-1">Deposit %</label>
          <input className="input" type="number" value={form.deposit} onChange={(e) => setForm((f) => ({ ...f, deposit: e.target.value }))} />
        </div>
      </div>
      <div>
        <label className="block text-xs text-graphite-300 mb-1">Footer text</label>
        <textarea className="input" rows={2} placeholder="e.g. Thank you for your business!" value={form.footer} onChange={(e) => setForm((f) => ({ ...f, footer: e.target.value }))} />
      </div>
      <p className="text-[11px] text-graphite-500">
        Late fee and deposit % are stored for reference — they're not yet automatically applied to invoice totals.
      </p>
      <button className="btn-primary" disabled={saving} onClick={save}>{saving ? "Saving..." : "Save"}</button>
    </div>
  );
}
