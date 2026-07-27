import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

// Local/dev stand-in for the live Stripe Connect payment flow described in the blueprint.
// TODO before going live: replace this with a real Stripe PaymentIntent against the
// company's connected account (stripeConnectAccountId), and only mark PAID from the
// webhook once Stripe confirms funds - never directly from this endpoint.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const invoice = await db.invoice.findFirst({ where: { id: params.id, companyId: ctx.company.id } });
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
  return NextResponse.json(updated);
}
