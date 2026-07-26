import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";
import { runTrigger } from "@/lib/automationEngine";
import { notify } from "@/lib/notify";

// Local dev stub for the internal "mark as paid" button. The real customer-facing
// path is /api/public/invoices/[token], which uses live Stripe Checkout when
// configured - see services/stripe.ts. This one stays a manual stub since it's
// staff marking an offline payment (cash/check) as received, not a card charge.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!ctx.company.payoutsEnabled) {
    return NextResponse.json(
      { error: "Complete payment verification in Settings before collecting payments." },
      { status: 403 }
    );
  }

  const invoice = await db.invoice.findFirst({ where: { id: params.id, companyId: ctx.company.id }, include: { customer: true } });
  if (!invoice) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await db.payment.create({
    data: {
      companyId: ctx.company.id,
      invoiceId: invoice.id,
      amount: invoice.amount,
      method: "manual",
      status: "succeeded"
    }
  });

  const updated = await db.invoice.update({ where: { id: invoice.id }, data: { status: "PAID" } });

  await notify({
    companyId: ctx.company.id,
    category: "INVOICE_PAID",
    title: `Payment received from ${invoice.customer.name}`,
    body: `$${Number(invoice.amount).toLocaleString()} marked paid.`,
    linkUrl: `/invoices/${invoice.id}`
  });

  await runTrigger(ctx.company.id, "INVOICE_PAID", {
    companyId: ctx.company.id,
    customerId: invoice.customerId,
    invoiceId: invoice.id,
    trigger: "INVOICE_PAID",
    amount: Number(invoice.amount)
  });

  return NextResponse.json(updated);
}
