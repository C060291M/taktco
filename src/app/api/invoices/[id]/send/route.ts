import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";
import { sendTrackedEmail } from "@/services/resend";
import { brandedEmail } from "@/emails/brandedEmail";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const invoice = await db.invoice.findFirst({
    where: { id: params.id, companyId: ctx.company.id, deletedAt: null },
    include: { customer: true }
  });
  if (!invoice) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!invoice.customer.email) return NextResponse.json({ error: "This customer has no email on file." }, { status: 400 });

  const link = `${process.env.NEXT_PUBLIC_APP_URL}/invoice/${invoice.paymentLinkToken}`;
  const amountDisplay = `$${Number(invoice.amount).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  const html = brandedEmail({
    companyName: ctx.company.name,
    logoUrl: ctx.company.logoUrl,
    accentColor: ctx.company.brandAccentColor,
    heading: `Invoice from ${ctx.company.name}`,
    bodyHtml: `Your invoice for ${amountDisplay} is ready. <a href="${link}">Click here to view and pay</a>.`
  });

  const result = await sendTrackedEmail({
    companyId: ctx.company.id,
    customerId: invoice.customerId,
    toEmail: invoice.customer.email,
    subject: `Invoice from ${ctx.company.name} - ${amountDisplay} due`,
    html,
    kind: "invoice"
  });

  if (result.sent && invoice.status === "UNPAID") {
    await db.invoice.update({ where: { id: invoice.id }, data: { status: "SENT" } });
  }

  return NextResponse.json(result, { status: result.sent ? 200 : 400 });
}
