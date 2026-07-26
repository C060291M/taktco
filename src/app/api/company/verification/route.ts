import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";
import { createConnectAccountLink, stripeConfigured } from "@/services/stripe";

const schema = z.object({ legalBusinessName: z.string().min(2) });

// Real path (when STRIPE_SECRET_KEY is set): creates a Stripe Connect Express
// account, sets verificationStatus to PENDING, and returns a real onboarding
// URL to redirect the owner to. Stripe collects EIN/SSN/bank details directly -
// none of that touches our database. The webhook (/api/webhooks/stripe) is
// what flips verificationStatus to VERIFIED and payoutsEnabled to true once
// Stripe confirms the account is charges/payouts enabled - never this route.
//
// Fallback (no Stripe key set): the original local dev simulation, so this
// still works with zero configuration for local testing.
export async function POST(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.user.role !== "OWNER") {
    return NextResponse.json({ error: "Only the account owner can start payment verification." }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Enter your legal business name." }, { status: 400 });

  await db.company.update({
    where: { id: ctx.company.id },
    data: { legalBusinessName: parsed.data.legalBusinessName }
  });

  if (stripeConfigured) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
    try {
      const { accountId, url } = await createConnectAccountLink({
        existingAccountId: ctx.company.stripeConnectAccountId,
        companyName: parsed.data.legalBusinessName,
        email: ctx.user.email,
        refreshUrl: `${appUrl}/settings/payments`,
        returnUrl: `${appUrl}/settings/payments`
      });

      await db.company.update({
        where: { id: ctx.company.id },
        data: { stripeConnectAccountId: accountId, verificationStatus: "PENDING" }
      });

      return NextResponse.json({ redirectUrl: url });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? `Stripe onboarding failed: ${err.message}` : "Stripe onboarding failed." },
        { status: 502 }
      );
    }
  }

  // Local dev simulation - see docstring above.
  const updated = await db.company.update({
    where: { id: ctx.company.id },
    data: { verificationStatus: "VERIFIED", payoutsEnabled: true }
  });

  await db.auditLog.create({
    data: { companyId: ctx.company.id, userId: ctx.user.id, action: "verification_completed", entityType: "company", entityId: ctx.company.id }
  });

  return NextResponse.json(updated);
}
