import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { createBillingPortalSession, stripeConfigured } from "@/services/stripe";

export async function POST(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.user.role !== "OWNER") return NextResponse.json({ error: "Only the account owner can manage billing." }, { status: 403 });
  if (!stripeConfigured || !ctx.company.stripeCustomerId) {
    return NextResponse.json({ error: "No active subscription to manage yet." }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  const session = await createBillingPortalSession({
    customerId: ctx.company.stripeCustomerId,
    returnUrl: `${appUrl}/settings/billing`
  });

  return NextResponse.json({ portalUrl: session.url });
}
