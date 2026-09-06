"use client";
import { useState } from "react";
import { getContrastingTextColor } from "@/lib/getContrastingTextColor";
import { formatDateInTz } from "@/lib/formatDate";

type LineItem = { description: string; qty: number; unit: string; unitPrice: number };
type Company = { name: string; logoUrl: string | null; brandAccentColor: string; timeZone: string };
type PaymentRow = { amount: number; paidAt: string; method: string };

function money(n: number) {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function PublicInvoiceView({
  token,
  customerName,
  company,
  status: initialStatus,
  invoiceNumber,
  amount,
  taxAmount,
  lineItems,
  dueDate,
  payments,
  payoutsEnabled,
  kind,
  totalPaid,
  depositPercent
}: {
  token: string;
  customerName: string;
  company: Company;
  status: string;
  invoiceNumber: string | null;
  amount: number;
  taxAmount: number;
  lineItems: LineItem[];
  dueDate: string | null;
  payments: PaymentRow[];
  payoutsEnabled: boolean;
  kind: string;
  totalPaid: number;
  depositPercent: number | null;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const remaining = Math.max(0, amount - totalPaid);
  const depositAmount = depositPercent ? Math.round(amount * (depositPercent / 100) * 100) / 100 : null;

  async function pay(choice?: "deposit" | "full" | "remaining") {
    setLoading(choice || "legacy");
    setError(null);
    const res = await fetch(`/api/public/invoices/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(choice ? { choice } : {})
    });
    const data = await res.json().catch(function () { return {}; });
    if (res.ok && data.checkoutUrl) {
      window.location.href = data.checkoutUrl;
      return;
    }
    setLoading(null);
    if (res.ok) setStatus(data.status);
    else setError(data.error || "Payment failed.");
  }

  return (
    <div className="min-h-screen bg-graphite-950 flex items-center justify-center p-4" style={{ ["--brand-accent" as string]: company.brandAccentColor, ["--brand-accent-foreground" as string]: getContrastingTextColor(company.brandAccentColor) }}>
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-3 mb-6 justify-center">
          {company.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={company.logoUrl} alt={company.name} className="h-10 w-10 rounded object-contain" />
          ) : (
            <div className="h-10 w-10 rounded bg-accent/20 flex items-center justify-center text-accent font-bold">
              {company.name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <p className="text-white font-medium text-lg">{company.name}</p>
        </div>

        <div className="card p-6" style={{ borderColor: company.brandAccentColor }}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm text-graphite-400">Invoice {invoiceNumber && `#${invoiceNumber}`}</p>
            {dueDate && <p className="text-xs text-graphite-500">Due {formatDateInTz(dueDate, company.timeZone)}</p>}
          </div>
          <h1 className="text-xl font-semibold text-white mb-4">{customerName}</h1>

          {lineItems.length > 0 && (
            <table className="w-full text-sm mb-4">
              <thead>
                <tr className="text-left text-graphite-400 border-b border-graphite-700">
                  <th className="py-2 font-medium">Item</th>
                  <th className="py-2 font-medium">Qty</th>
                  <th className="py-2 font-medium text-right">Price</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((li, i) => (
                  <tr key={i} className="border-b border-graphite-700 last:border-0">
                    <td className="py-2 text-graphite-100">{li.description}</td>
                    <td className="py-2 text-graphite-300">{li.qty} {li.unit}</td>
                    <td className="py-2 text-graphite-300 text-right">{money(li.qty * li.unitPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {taxAmount > 0 && (
            <div className="flex items-center justify-between text-sm text-graphite-400 pb-2">
              <span>Tax</span>
              <span>{money(taxAmount)}</span>
            </div>
          )}

          <div className="flex items-center justify-between pb-4 border-b border-graphite-700">
            <span className="text-graphite-300">{totalPaid > 0 && status !== "PAID" ? "Remaining balance" : "Amount due"}</span>
            <span className="text-white text-xl font-semibold">{money(status === "PAID" ? amount : remaining)}</span>
          </div>

          {payments.length > 0 && (
            <div className="pt-4">
              <p className="text-xs text-graphite-400 uppercase tracking-wide mb-2">Payment history</p>
              {payments.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-sm text-graphite-300">
                  <span>{formatDateInTz(p.paidAt, company.timeZone)} - {p.method}</span>
                  <span>{money(p.amount)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="pt-6">
            {status === "PAID" ? (
              <p className="text-emerald-400 text-sm font-medium text-center">Paid in full. Thank you!</p>
            ) : !payoutsEnabled ? (
              <p className="text-xs text-graphite-500 text-center">Online payment isn't set up yet for this invoice - contact {company.name} directly.</p>
            ) : kind !== "STANDARD" ? (
              <button className="btn-primary w-full" disabled={!!loading} onClick={() => pay()}>
                {loading ? "Processing..." : `Pay ${money(amount)}`}
              </button>
            ) : totalPaid > 0 ? (
              <button className="btn-primary w-full" disabled={!!loading} onClick={() => pay("remaining")}>
                {loading ? "Processing..." : `Pay Remaining Balance (${money(remaining)})`}
              </button>
            ) : (
              <div className="space-y-2">
                {depositAmount !== null && (
                  <button className="btn-secondary w-full" disabled={!!loading} onClick={() => pay("deposit")}>
                    {loading === "deposit" ? "Processing..." : `Pay Deposit (${money(depositAmount)})`}
                  </button>
                )}
                <button className="btn-primary w-full" disabled={!!loading} onClick={() => pay("full")}>
                  {loading === "full" ? "Processing..." : `Pay in Full (${money(amount)})`}
                </button>
              </div>
            )}
            {error && <p className="text-xs text-red-400 mt-2 text-center">{error}</p>}
          </div>
        </div>
        <p className="text-center text-[11px] text-graphite-600 mt-4">Powered by TAKTCO</p>
      </div>
    </div>
  );
}