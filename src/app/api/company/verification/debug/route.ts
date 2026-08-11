import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { stripe } from "@/services/stripe";

export async function GET() {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!stripe || !ctx.company.stripeConnectAccountId) {
    return NextResponse.json({ error: "No Stripe account connected." }, { status: 400 });
  }
  const account = await stripe.accounts.retrieve(ctx.company.stripeConnectAccountId);
  return NextResponse.json({
    charges_enabled: account.charges_enabled,
    payouts_enabled: account.payouts_enabled,
    capabilities: account.capabilities,
    requirements: account.requirements
  });
}
