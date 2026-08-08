import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { PayButton } from "@/features/invoices/PayButton";
import { DeleteInvoiceButton } from "@/features/invoices/DeleteInvoiceButton";
import { NewInvoiceForm } from "@/features/invoices/NewInvoiceForm";
import { DollarSign, AlertCircle, Clock } from "lucide-react";

function money(n: number | { toString(): string }) {
  return `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default async function InvoicesPage() {
  const ctx = await requireSession();
  if (!ctx) redirect("/login");
  const companyId = ctx.company.id;

  const [invoices, customers, jobs] = await Promise.all([
    db.invoice.findMany({ where: { companyId, deletedAt: null }, include: { customer: true }, orderBy: { createdAt: "desc" } }),
    db.customer.findMany({ where: { companyId, deletedAt: null }, orderBy: { name: "asc" } }),
    db.job.findMany({ where: { companyId }, include: { customer: true }, orderBy: { createdAt: "desc" } })
  ]);

  const outstanding = invoices.filter((i) => i.status === "UNPAID" || i.status === "PARTIALLY_PAID" || i.status === "OVERDUE");
  const outstandingTotal = outstanding.reduce((sum, i) => sum + Number(i.amount), 0);
  const overdueCount = invoices.filter((i) => i.status === "OVERDUE").length;
  const dueThisWeek = invoices.filter((i) => {
    if (!i.dueDate || i.status === "PAID") return false;
    const days = (new Date(i.dueDate).getTime() - Date.now()) / 86400000;
    return days >= 0 && days <= 7;
  }).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Invoices</h1>
          <p className="text-sm text-graphite-400">
            {ctx.company.payoutsEnabled
              ? "Customers pay online through the link on each invoice. \"Pay\" below is for marking cash/check payments received manually."
              : "Verify payment collection in Settings to let customers pay online."}
          </p>
        </div>
        <NewInvoiceForm
          customers={customers.map((c) => ({ id: c.id, name: c.name }))}
          jobs={jobs.map((j) => ({ id: j.id, label: `${j.customer.name} — ${money(j.quotedCost)}` }))}
          defaultDueDays={ctx.company.defaultInvoiceDueDays}
          hasDepositPercent={Boolean(ctx.company.defaultDepositPercent)}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Outstanding" value={money(outstandingTotal)} icon={DollarSign} tone={outstandingTotal > 0 ? "warning" : "neutral"} />
        <StatCard label="Overdue" value={String(overdueCount)} icon={AlertCircle} tone={overdueCount > 0 ? "warning" : "neutral"} />
        <StatCard label="Due this week" value={String(dueThisWeek)} icon={Clock} tone="accent" />
      </div>

      {!ctx.company.payoutsEnabled && (
        <div className="card p-4 border-amber-500/40 bg-amber-500/5 flex items-center justify-between">
          <div>
            <p className="text-sm text-amber-300 font-medium">Payment collection is locked</p>
            <p className="text-xs text-graphite-400 mt-0.5">
              Verify your business in Settings to start collecting customer payments through TAKTCO.
            </p>
          </div>
          <a href="/settings" className="btn-primary text-xs whitespace-nowrap shrink-0 ml-4">Verify now</a>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-graphite-400 border-b border-graphite-700">
              <th className="px-4 py-3 font-medium">Invoice</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-graphite-400">No invoices yet.</td></tr>
            )}
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-b border-graphite-700 last:border-0 hover:bg-graphite-800/60">
                <td className="px-4 py-3 text-graphite-400 text-xs">{inv.invoiceNumber || "—"}</td>
                <td className="px-4 py-3 text-graphite-100">
                  <Link href={`/invoices/${inv.id}`} className="hover:text-accent">{inv.customer.name}</Link>
                </td>
                <td className="px-4 py-3 text-graphite-300">{money(inv.amount)}</td>
                <td className="px-4 py-3">
                  <Badge color={inv.status === "PAID" ? "green" : inv.status === "OVERDUE" ? "red" : "yellow"}>
                    {inv.status.replace(/_/g, " ")}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                  {inv.status !== "PAID" && <PayButton invoiceId={inv.id} disabled={!ctx.company.payoutsEnabled} />}
                  {(ctx.user.role === "OWNER" || ctx.user.role === "ADMIN") && (
                    <DeleteInvoiceButton invoiceId={inv.id} invoiceNumber={inv.invoiceNumber} redirectAfterDelete={false} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
