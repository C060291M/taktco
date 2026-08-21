import { db } from "@/database/client";
import { notFound } from "next/navigation";
import { PublicInvoiceView } from "./PublicInvoiceView";

export default async function PublicInvoicePage({ params }: { params: { token: string } }) {
  const invoice = await db.invoice.findUnique({
    where: { paymentLinkToken: params.token },
    include: { customer: true, company: true, payments: true }
  });
  if (!invoice) notFound();

  if (!invoice.viewedAt && invoice.status === "SENT") {
    await db.invoice.update({ where: { id: invoice.id }, data: { viewedAt: new Date(), status: "VIEWED" } });
  }

  const lineItems = invoice.lineItems as unknown as { description: string; qty: number; unit: string; unitPrice: number }[];

  return (
    <PublicInvoiceView
      token={params.token}
      customerName={invoice.customer.name}
      company={{ name: invoice.company.name, logoUrl: invoice.company.logoUrl, brandAccentColor: invoice.company.brandAccentColor, timeZone: invoice.company.timeZone }}
      status={invoice.status}
      invoiceNumber={invoice.invoiceNumber}
      amount={Number(invoice.amount)}
      taxAmount={Number(invoice.taxAmount)}
      lineItems={lineItems}
      dueDate={invoice.dueDate ? invoice.dueDate.toISOString() : null}
      payments={invoice.payments.map((p) => ({ amount: Number(p.amount), paidAt: p.paidAt.toISOString(), method: p.method }))}
      payoutsEnabled={invoice.company.payoutsEnabled}
    />
  );
}

