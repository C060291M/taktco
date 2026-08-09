import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";
import { sendTrackedEmail } from "@/services/resend";
import { brandedEmail } from "@/emails/brandedEmail";
import { bumpLeadStageForCustomer } from "@/lib/leadStageAutomation";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const estimate = await db.estimate.findFirst({
    where: { id: params.id, companyId: ctx.company.id, deletedAt: null },
    include: { customer: true }
  });
  if (!estimate) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!estimate.customer.email) return NextResponse.json({ error: "This customer has no email on file." }, { status: 400 });

  const link = `${process.env.NEXT_PUBLIC_APP_URL}/estimate/${estimate.approvalToken}`;
  const html = brandedEmail({
    companyName: ctx.company.name,
    logoUrl: ctx.company.logoUrl,
    accentColor: ctx.company.brandAccentColor,
    heading: `Your estimate from ${ctx.company.name}`,
    bodyHtml: `Your estimate is ready to review. <a href="${link}">Click here to view and approve it</a>.`
  });

  const result = await sendTrackedEmail({
    companyId: ctx.company.id,
    customerId: estimate.customerId,
    toEmail: estimate.customer.email,
    subject: `Your estimate from ${ctx.company.name}`,
    html,
    kind: "estimate_approval"
  });

  if (result.sent && estimate.status === "DRAFT") {
    await db.estimate.update({ where: { id: estimate.id }, data: { status: "SENT" } });
    await bumpLeadStageForCustomer(ctx.company.id, estimate.customerId, "ESTIMATE_SENT");
  }

  return NextResponse.json(result, { status: result.sent ? 200 : 400 });
}


