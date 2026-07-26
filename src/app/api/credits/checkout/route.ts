import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";
import { stripe, stripeConfigured } from "@/services/stripe";

const schema = z.object({ packageId: z.string() });

// Credit purchases are platform billing (TAKTCO charging the company directly)
// - a completely separate Stripe flow from the Connect-based customer payment
// collection elsewhere in the app. No "on behalf of" connected account here;
// this Checkout Session belongs to TAKTCO's own Stripe account.
export async function POST(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!stripeConfigured || !stripe) {
    return NextResponse.json({ error: "Credit purchases aren't configured yet." }, { status: 501 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Pick a package." }, { status: 400 });

  const pkg = await db.creditPackage.findFirst({ where: { id: parsed.data.packageId, active: true } });
  if (!pkg) return NextResponse.json({ error: "Package not found." }, { status: 404 });

  const purchase = await db.creditPurchase.create({
    data: { companyId: ctx.company.id, packageId: pkg.id, credits: pkg.credits, priceCents: pkg.priceCents, status: "pending" }
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      { price_data: { currency: "usd", unit_amount: pkg.priceCents, product_data: { name: `${pkg.credits.toLocaleString()} TAKTCO Credits` } }, quantity: 1 }
    ],
    success_url: `${appUrl}/settings/ai/credits?purchased=1`,
    cancel_url: `${appUrl}/settings/ai/credits`,
    metadata: { purchaseId: purchase.id, companyId: ctx.company.id }
  });

  await db.creditPurchase.update({ where: { id: purchase.id }, data: { stripeCheckoutSessionId: session.id } });

  return NextResponse.json({ checkoutUrl: session.url });
}
