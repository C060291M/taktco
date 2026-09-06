import { db } from "@/database/client";
import { claimNextInvoiceNumber } from "@/lib/documentNumbers";
import { notify } from "@/lib/notify";

export async function generateDepositInvoicePair(params: { companyId: string; jobId: string; dueDays?: number }) {
  const [company, job] = await Promise.all([
    db.company.findUnique({ where: { id: params.companyId } }),
    db.job.findFirst({ where: { id: params.jobId, companyId: params.companyId }, include: { estimate: true, customer: true } })
  ]);

  if (!company || !job) throw new Error("Job not found.");
  if (!company.defaultDepositPercent) throw new Error("Set a default deposit % in Settings -> Invoice Defaults first.");
  if (!job.estimate) throw new Error("This job has no linked estimate to base a deposit on.");

  const total = Number(job.estimate.totalAmount);
  const depositPercent = Number(company.defaultDepositPercent);
  const depositAmount = Math.round(total * (depositPercent / 100) * 100) / 100;
  const remainingAmount = Math.round((total - depositAmount) * 100) / 100;

  const dueDays = params.dueDays ?? company.defaultInvoiceDueDays ?? 14;
  const dueDate = new Date(Date.now() + dueDays * 24 * 60 * 60 * 1000);

  const depositInvoiceNumber = await claimNextInvoiceNumber(params.companyId);

  const deposit = await db.invoice.create({
    data: {
      companyId: params.companyId,
      jobId: job.id,
      customerId: job.customerId,
      invoiceNumber: depositInvoiceNumber,
      amount: depositAmount,
      lineItems: [{ description: `Deposit (${depositPercent}% of $${total.toLocaleString()})`, qty: 1, unit: "ea", unitPrice: depositAmount }],
      kind: "DEPOSIT",
      status: "UNPAID",
      dueDate
    }
  });

  const finalBalanceInvoiceNumber = await claimNextInvoiceNumber(params.companyId);

  const finalBalance = await db.invoice.create({
    data: {
      companyId: params.companyId,
      jobId: job.id,
      customerId: job.customerId,
      invoiceNumber: finalBalanceInvoiceNumber,
      amount: remainingAmount,
      lineItems: [{ description: `Remaining balance (after ${depositPercent}% deposit)`, qty: 1, unit: "ea", unitPrice: remainingAmount }],
      kind: "FINAL_BALANCE",
      status: "DRAFT",
      pairedInvoiceId: deposit.id,
      dueDate
    }
  });

  await db.invoice.update({ where: { id: deposit.id }, data: { pairedInvoiceId: finalBalance.id } });

  return { deposit, finalBalance };
}

// Called right after any invoice is marked PAID (manual staff button, public
// Stripe checkout stub, or the real Stripe webhook - all three call this).
// If the paid invoice is a DEPOSIT with a paired FINAL_BALANCE invoice still
// sitting in DRAFT, promotes it to UNPAID (visible/sendable) and notifies
// staff, rather than silently leaving the remaining-balance invoice invisible.
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
    linkUrl: `/invoices/${paired.id}`
  });

  return updated;
}