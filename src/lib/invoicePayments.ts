import { db } from "@/database/client";
import { notify } from "@/lib/notify";
import { runTrigger } from "@/lib/automationEngine";

export type PaymentChoice = "deposit" | "full" | "remaining";

// Sums succeeded payments minus refunds for an invoice - the single source
// of truth for "how much has actually been paid so far" used everywhere
// below and on the invoice detail page.
export function totalPaidOnInvoice(payments: { status: string; amount: unknown; refundedAmount: unknown }[]) {
  return payments
    .filter(function (p) { return p.status === "succeeded"; })
    .reduce(function (sum, p) { return sum + Number(p.amount) - Number(p.refundedAmount || 0); }, 0);
}

// Given a staff or customer's choice (deposit / full / remaining), resolves
// the exact dollar amount to charge right now, validating that the choice
// makes sense given what has already been paid. Deposit % comes from the
// company's Invoice Defaults setting.
export async function resolvePaymentAmount(invoiceId: string, companyId: string, choice: PaymentChoice): Promise<number> {
  const [invoice, company] = await Promise.all([
    db.invoice.findFirst({ where: { id: invoiceId, companyId }, include: { payments: true } }),
    db.company.findUnique({ where: { id: companyId } })
  ]);
  if (!invoice || !company) throw new Error("Invoice not found.");

  const totalPaid = totalPaidOnInvoice(invoice.payments);
  const remaining = Math.max(0, Number(invoice.amount) - totalPaid);
  if (remaining <= 0) throw new Error("This invoice is already paid in full.");

  if (choice === "remaining") {
    if (totalPaid <= 0) throw new Error("No deposit has been paid yet - choose Deposit or Full instead.");
    return Math.round(remaining * 100) / 100;
  }
  if (choice === "full") {
    if (totalPaid > 0) throw new Error("A payment has already been made - choose Remaining instead.");
    return Math.round(Number(invoice.amount) * 100) / 100;
  }
  if (choice === "deposit") {
    if (totalPaid > 0) throw new Error("A payment has already been made on this invoice.");
    if (!company.defaultDepositPercent) throw new Error("Set a default deposit % in Settings -> Invoice Defaults first.");
    const depositAmount = Number(invoice.amount) * (Number(company.defaultDepositPercent) / 100);
    return Math.round(depositAmount * 100) / 100;
  }
  throw new Error("Invalid payment choice.");
}

// Records a payment of a given amount against an invoice - creates the
// Payment row, sets the invoice to PARTIALLY_PAID or PAID depending on the
// running total, and fires the standard notify/automation pattern. Called
// by all three payment paths (manual staff button, public Stripe checkout,
// Stripe webhook) so the outcome is identical no matter how the customer
// actually pays.
export async function recordInvoicePayment(params: {
  invoiceId: string;
  companyId: string;
  amount: number;
  method: string;
  stripePaymentIntentId?: string;
  stripeCheckoutSessionId?: string;
}) {
  const invoice = await db.invoice.findFirst({
    where: { id: params.invoiceId, companyId: params.companyId },
    include: { customer: true, payments: true }
  });
  if (!invoice) throw new Error("Invoice not found.");

  await db.payment.create({
    data: {
      companyId: params.companyId,
      invoiceId: invoice.id,
      amount: params.amount,
      method: params.method,
      stripePaymentIntentId: params.stripePaymentIntentId,
      stripeCheckoutSessionId: params.stripeCheckoutSessionId,
      status: "succeeded"
    }
  });

  const priorPaid = totalPaidOnInvoice(invoice.payments);
  const totalPaidNow = priorPaid + params.amount;
  const isFullyPaid = totalPaidNow >= Number(invoice.amount) - 0.01;
  const newStatus = isFullyPaid ? "PAID" : "PARTIALLY_PAID";

  const updated = await db.invoice.update({ where: { id: invoice.id }, data: { status: newStatus } });

  await notify({
    companyId: params.companyId,
    category: "INVOICE_PAID",
    title: isFullyPaid
      ? `Payment received from ${invoice.customer.name}`
      : `Deposit received from ${invoice.customer.name} - remaining balance due`,
    body: isFullyPaid
      ? `$${params.amount.toLocaleString()} paid in full.`
      : `$${params.amount.toLocaleString()} received. Remaining balance: $${(Number(invoice.amount) - totalPaidNow).toLocaleString()}.`,
    linkUrl: `/invoices/${invoice.invoiceNumber}`
  });

  if (isFullyPaid) {
    await runTrigger(params.companyId, "INVOICE_PAID", {
      companyId: params.companyId,
      customerId: invoice.customerId,
      invoiceId: invoice.id,
      trigger: "INVOICE_PAID",
      amount: Number(invoice.amount)
    });
  }

  return updated;
}