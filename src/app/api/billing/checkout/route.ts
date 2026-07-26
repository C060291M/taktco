import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";
import { createSubscriptionCheckoutSession, priceIdForTier, stripeConfigured } from "@/services/stripe";

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
  const session = await createSubscriptionCheckoutSession({
    companyId: ctx.company.id,
    companyName: ctx.company.name,
    email: ctx.user.email,
    existingCustomerId: ctx.company.stripeCustomerId,
    priceId,
    successUrl: `${appUrl}/settings/billing?subscribed=1`,
    cancelUrl: `${appUrl}/settings/billing`
  });

  return NextResponse.json({ checkoutUrl: session.url });
}
