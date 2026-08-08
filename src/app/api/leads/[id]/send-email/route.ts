import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";
import { sendTrackedEmail } from "@/services/resend";

const schema = z.object({
  subject: z.string().min(1),
  body: z.string().min(1)
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Enter a subject and message." }, { status: 400 });

  const lead = await db.lead.findFirst({
    where: { id: params.id, companyId: ctx.company.id },
    include: { customer: true }
  });
  if (!lead) return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  if (!lead.customer.email) return NextResponse.json({ error: "This customer has no email on file." }, { status: 400 });

  const html = parsed.data.body.replace(/\n/g, "<br>");

  const result = await sendTrackedEmail({
    companyId: ctx.company.id,
    customerId: lead.customerId,
    toEmail: lead.customer.email,
    subject: parsed.data.subject,
    html,
    kind: "LEAD_MANUAL"
  });

  if (result.sent) {
    await db.communication.create({
      data: {
        companyId: ctx.company.id,
        customerId: lead.customerId,
        userId: ctx.user.id,
        type: "EMAIL",
        content: `Sent: "${parsed.data.subject}"`
      }
    });
  }

  return NextResponse.json(result, { status: result.sent ? 200 : 400 });
}
