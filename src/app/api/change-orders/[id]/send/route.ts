import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";
import { sendTrackedEmail } from "@/services/resend";
import { brandedEmail } from "@/emails/brandedEmail";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const changeOrder = await db.changeOrder.findFirst({
    where: { id: params.id, companyId: ctx.company.id },
    include: { job: { include: { customer: true } } }
  });
  if (!changeOrder) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!changeOrder.job.customer.email) return NextResponse.json({ error: "This customer has no email on file." }, { status: 400 });

  const link = process.env.NEXT_PUBLIC_APP_URL + "/change-order/" + changeOrder.signingToken;
  const html = brandedEmail({
    companyName: ctx.company.name,
    logoUrl: ctx.company.logoUrl,
    accentColor: ctx.company.brandAccentColor,
    heading: "A change order needs your approval",
    bodyHtml: "There's an update to your project's scope and price. <a href=\"" + link + "\">Click here to review and approve it</a>."
  });

  const result = await sendTrackedEmail({
    companyId: ctx.company.id,
    customerId: changeOrder.job.customerId,
    toEmail: changeOrder.job.customer.email,
    subject: "Change order needs your approval - " + ctx.company.name,
    html,
    kind: "change_order_approval"
  });

  if (result.sent && changeOrder.status === "DRAFT") {
    await db.changeOrder.update({ where: { id: changeOrder.id }, data: { status: "SENT" } });
  }

  return NextResponse.json(result, { status: result.sent ? 200 : 400 });
}
