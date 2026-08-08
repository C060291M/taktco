import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

// Local dev-only endpoint that simulates Stripe finishing underwriting a few seconds
// after submission. In production this never exists as a callable route - approval
// arrives via a Stripe webhook (account.updated) that you cannot trigger yourself.
export async function POST() {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (ctx.company.verificationStatus !== "PENDING") {
    return NextResponse.json({ error: "No pending verification to approve." }, { status: 400 });
  }

  const updated = await db.company.update({
    where: { id: ctx.company.id },
    data: { verificationStatus: "VERIFIED", verifiedAt: new Date(), payoutsEnabled: true }
  });

  return NextResponse.json(updated);
}
