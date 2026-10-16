import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";
import { createSubscriptionCheckoutSession, priceIdForTier, stripeConfigured } from "@/services/stripe";
import { accessInfo } from "@/lib/accountAccess";
import { stripeTrialEnd } from "@/lib/billingAccess";

const schema = z.object({ tier: z.enum(["starter", "pro", "corporate"]) });

export async function POST(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.user.role !== "OWNER") return NextResponse.json({ error: "Only the account owner can manage billing." }, { status: 403 });
  if (!stripeConfigured) return NextResponse.json({ error: "Billing isn't configured yet." }, { status: 501 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Pick a plan." }, { status: 400 });

  const priceId = priceIdForTier(parsed.data.tier);
  if (!priceId) return NextResponse.json({ error: `No Stripe price configured for the ${parsed.data.tier} tier.` }, { status: 501 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;

  // A company still inside a closed-beta or free-trial window is billed from the end of that window
  // (or immediately when under 48 hours remain), so nobody gets a second free week. A company with
  // no window keeps the standard 7-day trial. See src/lib/billingAccess.ts.
  const info = accessInfo(ctx.company);
  const session = await createSubscriptionCheckoutSession({
    companyId: ctx.company.id,
    companyName: ctx.company.name,
    email: ctx.user.email,
    existingCustomerId: ctx.company.stripeCustomerId,
    priceId,
    successUrl: `${appUrl}/settings/billing?subscribed=1`,
    cancelUrl: `${appUrl}/settings/billing`,
    ...(info.kind ? { trialEnd: stripeTrialEnd(info) } : { trialDays: 7 })
  });

  return NextResponse.json({ checkoutUrl: session.url });
}