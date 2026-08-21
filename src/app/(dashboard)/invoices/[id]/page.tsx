import { db } from "@/database/client";
import { formatDateInTz } from "@/lib/formatDate";
import { requireSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { BrandedDocumentHeader } from "@/components/layout/BrandedDocumentHeader";
import { Badge } from "@/components/ui/Badge";
import { PayButton } from "@/features/invoices/PayButton";
import { DeleteInvoiceButton } from "@/features/invoices/DeleteInvoiceButton";
import { CopyPublicLink } from "@/components/forms/CopyPublicLink";
import { PrintButton } from "@/components/ui/PrintButton";
import { SendInvoiceButton } from "@/features/invoices/SendInvoiceButton";

function money(n: number | { toString(): string }) {
  return `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) redirect("/login");

  const invoice = await db.invoice.findFirst({
    where: { id: params.id, companyId: ctx.company.id, deletedAt: null },
    include: { customer: true, job: true, payments: true }
  });
  if (!invoice) notFound();

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="card p-5 print-document">
        <BrandedDocumentHeader company={ctx.company} label="Invoice" />
        <div className="pt-2 pb-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-white">Billed to {invoice.customer.name}</h1>
            {invoice.invoiceNumber && <p className="text-xs text-graphite-500">#{invoice.invoiceNumber}</p>}
            {invoice.dueDate && (
              <p className="text-sm text-graphite-400">Due {formatDateInTz(invoice.dueDate, ctx.company.timeZone)}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge color={invoice.status === "PAID" ? "green" : invoice.status === "OVERDUE" ? "red" : "yellow"}>
              {invoice.status.replace(/_/g, " ")}
            </Badge>
            <div className="flex gap-2">
              <PrintButton />
              <CopyPublicLink token={invoice.paymentLinkToken} basePath="invoice" />
              <SendInvoiceButton invoiceId={invoice.id} />
              {(ctx.user.role === "OWNER") && (
                <DeleteInvoiceButton invoiceId={invoice.id} invoiceNumber={invoice.invoiceNumber} />
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-graphite-700">
          <span className="text-graphite-300">Amount due</span>
          <span className="text-white text-2xl font-semibold">{money(invoice.amount)}</span>
        </div>
      </div>

      {invoice.status !== "PAID" && (
        <div className="card p-5 flex items-center justify-between">
          <p className="text-sm text-graphite-300">
            {ctx.company.payoutsEnabled ? "Collect this payment now." : "Payment collection is locked until verification is complete."}
          </p>
          <PayButton invoiceId={invoice.id} disabled={!ctx.company.payoutsEnabled} />
        </div>
      )}

      {invoice.payments.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-medium text-white mb-3">Payment history</h2>
          <div className="space-y-2">
            {invoice.payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span className="text-graphite-300">{formatDateInTz(p.paidAt, ctx.company.timeZone)} · {p.method}</span>
                <span className="text-graphite-100">{money(p.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}




