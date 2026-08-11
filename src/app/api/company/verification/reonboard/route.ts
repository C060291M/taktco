import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { createConnectAccountLink } from "@/services/stripe";

// Generates a fresh Stripe onboarding link for an existing connected
// account and redirects straight there - bypasses our own app's
// "Verified" status gate, since Stripe itself may still have outstanding
// requirements (like a missing DOB/SSN) even when our summary status looks
// done.
export async function GET(req: Request) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctx.company.stripeConnectAccountId) {
    return NextResponse.json({ error: "No Stripe account connected yet." }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  const { url } = await createConnectAccountLink({
    existingAccountId: ctx.company.stripeConnectAccountId,
    companyName: ctx.company.legalBusinessName || ctx.company.name,
    email: ctx.user.email,
    refreshUrl: `${appUrl}/settings/payments`,
    returnUrl: `${appUrl}/settings/payments`
  });

  return NextResponse.redirect(url);
}
