import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/client";
import { createInvoiceCheckoutSession, stripeConfigured } from "@/services/stripe";
import { runTrigger } from "@/lib/automationEngine";
import { notify } from "@/lib/notify";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const invoice = await db.invoice.findUnique({
    where: { paymentLinkToken: params.token },
    include: { customer: true, company: true, payments: true }
  });
  if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });

  if (!invoice.viewedAt && invoice.status === "SENT") {
    await db.invoice.update({ where: { id: invoice.id }, data: { viewedAt: new Date(), status: "VIEWED" } });
  }

  return NextResponse.json({
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    amount: invoice.amount,
    lineItems: invoice.lineItems,
    taxAmount: invoice.taxAmount,
    dueDate: invoice.dueDate,
    notes: invoice.notes,
    customer: { name: invoice.customer.name },
    company: { name: invoice.company.name, logoUrl: invoice.company.logoUrl, brandAccentColor: invoice.company.brandAccentColor },
    payments: invoice.payments.map((p) => ({ amount: p.amount, paidAt: p.paidAt, method: p.method })),
    payoutsEnabled: invoice.company.payoutsEnabled
  });
}

// Real path (Stripe configured + company has a connected account): creates a
// hosted Checkout Session and returns its URL - the actual PAID transition
// happens later, from the webhook, once Stripe confirms the charge, never here.
// Fallback: the original local dev stub, marks paid immediately.
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const { allowed, retryAfterMs } = checkRateLimit(`pay:${clientIp(req)}`, 10, 5 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } }
    );
  }

  const invoice = await db.invoice.findUnique({ where: { paymentLinkToken: params.token }, include: { company: true, customer: true } });
  if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  if (!invoice.company.payoutsEnabled) {
    return NextResponse.json({ error: "This company hasn't enabled payment collection yet." }, { status: 403 });
  }
  if (invoice.status === "PAID") {
    return NextResponse.json({ error: "This invoice is already paid." }, { status: 400 });
  }

  if (stripeConfigured && invoice.company.stripeConnectAccountId) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
    try {
      const { url } = await createInvoiceCheckoutSession({
        connectedAccountId: invoice.company.stripeConnectAccountId,
        invoiceId: invoice.id,
        amountCents: Math.round(Number(invoice.amount) * 100),
        customerEmail: invoice.customer.email || undefined,
        description: `Invoice ${invoice.invoiceNumber || ""} - ${invoice.company.name}`.trim(),
        successUrl: `${appUrl}/invoice/${params.token}?paid=1`,
        cancelUrl: `${appUrl}/invoice/${params.token}`
      });
      return NextResponse.json({ checkoutUrl: url });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? `Checkout failed: ${err.message}` : "Checkout failed." },
        { status: 502 }
      );
    }
  }

  // Local dev stub fallback - same honest behavior as before.
  await db.payment.create({
    data: { companyId: invoice.companyId, invoiceId: invoice.id, amount: invoice.amount, method: "manual", status: "succeeded" }
  });
  const updated = await db.invoice.update({ where: { id: invoice.id }, data: { status: "PAID" } });

  await notify({
    companyId: invoice.companyId,
    category: "INVOICE_PAID",
    title: `Payment received from ${invoice.customer.name}`,
    body: `$${Number(invoice.amount).toLocaleString()} paid online.`,
    linkUrl: `/invoices/${invoice.id}`
  });

  await runTrigger(invoice.companyId, "INVOICE_PAID", {
    companyId: invoice.companyId,
    customerId: invoice.customerId,
    invoiceId: invoice.id,
    trigger: "INVOICE_PAID",
    amount: Number(invoice.amount)
  });

  return NextResponse.json({ status: updated.status });
}
