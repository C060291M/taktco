import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";
import { isConnectAccountReady, requestAccountCapabilities } from "@/services/stripe";

// Manually re-checks Stripe's live account status instead of waiting for a
// webhook - useful the first time a webhook endpoint is set up after
// onboarding already completed (the webhook only fires on future changes,
// never retroactively for state that already existed).
export async function POST(_req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctx.company.stripeConnectAccountId) {
    return NextResponse.json({ error: "No Stripe account connected yet." }, { status: 400 });
  }

  await requestAccountCapabilities(ctx.company.stripeConnectAccountId);
  const ready = await isConnectAccountReady(ctx.company.stripeConnectAccountId);

  const updated = await db.company.update({
    where: { id: ctx.company.id },
    data: ready ? { verificationStatus: "VERIFIED", payoutsEnabled: true } : {}
  });

  return NextResponse.json({ ready, verificationStatus: updated.verificationStatus, payoutsEnabled: updated.payoutsEnabled });
}


