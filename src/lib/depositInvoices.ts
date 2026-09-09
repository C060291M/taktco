import { db } from "@/database/client";
import { notify } from "@/lib/notify";

// Called right after any invoice is marked PAID (manual staff button, public
// Stripe checkout stub, or the real Stripe webhook - all three call this).
// If the paid invoice is a DEPOSIT with a paired FINAL_BALANCE invoice still
// sitting in DRAFT, promotes it to UNPAID (visible/sendable) and notifies
// staff, rather than silently leaving the remaining-balance invoice invisible.
//
// This only matters for legacy DEPOSIT/FINAL_BALANCE invoice pairs created
// by the earlier two-invoice-pair feature (now superseded by choosing
// deposit/full/remaining at payment time on a single invoice - see
// src/lib/invoicePayments.ts) - kept so any already-existing legacy pairs
// keep working correctly.
export async function promoteFinalBalanceIfDepositPaid(invoiceId: string) {
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: { customer: true }
  });
  if (!invoice || invoice.kind !== "DEPOSIT" || !invoice.pairedInvoiceId) return null;

  const paired = await db.invoice.findUnique({ where: { id: invoice.pairedInvoiceId } });
  if (!paired || paired.status !== "DRAFT") return null;

  const updated = await db.invoice.update({ where: { id: paired.id }, data: { status: "UNPAID" } });

  await notify({
    companyId: invoice.companyId,
    category: "SYSTEM_ANNOUNCEMENT",
    title: `Deposit paid by ${invoice.customer.name} - remaining balance ready to send`,
    body: `The $${Number(paired.amount).toLocaleString()} remaining balance invoice is ready. Send it whenever you're ready to collect the rest.`,
    linkUrl: `/invoices/${paired.invoiceNumber}`
  });

  return updated;
}