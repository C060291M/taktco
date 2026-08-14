import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";
import { sendTrackedEmail } from "@/services/resend";
import { brandedEmail } from "@/emails/brandedEmail";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contract = await db.contract.findFirst({
    where: { id: params.id, companyId: ctx.company.id },
    include: { customer: true }
  });
  if (!contract) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!contract.companySignedByName) {
    return NextResponse.json({ error: "Sign the contract as your company before sending it to the client." }, { status: 400 });
  }
  if (!contract.customer.email) return NextResponse.json({ error: "This customer has no email on file." }, { status: 400 });

  const link = `${process.env.NEXT_PUBLIC_APP_URL}/contract/${contract.signingToken}`;
  const html = brandedEmail({
    companyName: ctx.company.name,
    logoUrl: ctx.company.logoUrl,
    accentColor: ctx.company.brandAccentColor,
    heading: `${contract.title} - ready for your signature`,
    bodyHtml: `Please review and sign your ${contract.title.toLowerCase()}. <a href="${link}">Click here to review and sign</a>.`
  });

  const result = await sendTrackedEmail({
    companyId: ctx.company.id,
    customerId: contract.customerId,
    toEmail: contract.customer.email,
    subject: `${contract.title} from ${ctx.company.name} - ready for your signature`,
    html,
    kind: "contract_signature"
  });

  if (result.sent && contract.status === "DRAFT") {
    await db.contract.update({ where: { id: contract.id }, data: { status: "SENT" } });
  }

  return NextResponse.json(result, { status: result.sent ? 200 : 400 });
}
