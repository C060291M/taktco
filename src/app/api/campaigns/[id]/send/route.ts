import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";
import { sendTrackedEmail } from "@/services/resend";
import { sendTrackedSms } from "@/services/twilio";
import { brandedEmail } from "@/emails/brandedEmail";

// Real delivery via the same tracked Resend/Twilio services used for
// transactional email elsewhere in the app - sendTrackedEmail/sendTrackedSms
// already log every attempt to EmailLog/SmsLog and fail open (log as FAILED,
// don't throw) when the provider isn't configured, so this route behaves
// correctly whether or not real keys are set.
//
// Synchronous per-recipient loop - fine at the list sizes a single trade
// business has today. A real send queue (retry, backoff, rate limiting
// against provider limits) is the right next step once volume justifies it -
// see the README's deferred-items list.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const campaign = await db.campaign.findFirst({ where: { id: params.id, companyId: ctx.company.id } });
  if (!campaign) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (campaign.status === "SENT") return NextResponse.json({ error: "This campaign was already sent." }, { status: 400 });

  const recipients = await db.customer.findMany({
    where: {
      companyId: ctx.company.id,
      deletedAt: null,
      ...(campaign.audience === "SPECIFIC_CUSTOMERS" ? { id: { in: campaign.recipientCustomerIds as unknown as string[] } } : {}),
      ...(campaign.audience === "ACTIVE_LEADS" ? { leads: { some: { pipelineStage: { notIn: ["WON", "LOST"] } } } } : {}),
      ...(campaign.audience === "PAST_CUSTOMERS" ? { jobs: { some: { status: { in: ["COMPLETE", "CLOSED"] } } } } : {})
    },
    select: { id: true, name: true, email: true, phone: true }
  });

  let delivered = 0;
  let failed = 0;

  for (const customer of recipients) {
    if (campaign.channel === "EMAIL") {
      if (!customer.email) {
        failed++;
        continue;
      }
      const html = brandedEmail({
        companyName: ctx.company.name,
        logoUrl: ctx.company.logoUrl,
        accentColor: ctx.company.brandAccentColor,
        heading: campaign.subject || campaign.name,
        bodyHtml: campaign.message.replace(/\n/g, "<br/>")
      });
      const result = await sendTrackedEmail({
        companyId: ctx.company.id,
        customerId: customer.id,
        toEmail: customer.email,
        subject: campaign.subject || campaign.name,
        html,
        kind: "campaign"
      });
      result.sent ? delivered++ : failed++;
    } else {
      if (!customer.phone) {
        failed++;
        continue;
      }
      const result = await sendTrackedSms({
        companyId: ctx.company.id,
        customerId: customer.id,
        toPhone: customer.phone,
        body: campaign.message,
        kind: "campaign"
      });
      result.sent ? delivered++ : failed++;
    }
  }

  const updated = await db.campaign.update({
    where: { id: campaign.id },
    data: { status: "SENT", sentAt: new Date(), recipientCount: recipients.length, deliveredCount: delivered, failedCount: failed }
  });

  return NextResponse.json(updated);
}
