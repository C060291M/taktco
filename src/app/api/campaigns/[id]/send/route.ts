import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";
import { sendTrackedEmail } from "@/services/resend";
import { sendTrackedSms } from "@/services/twilio";
import { brandedEmail } from "@/emails/brandedEmail";
import { getRemainingSendAllowance } from "@/lib/emailThrottle";

// Real delivery via the same tracked Resend/Twilio services used for
// transactional email elsewhere in the app - sendTrackedEmail/sendTrackedSms
// already log every attempt to EmailLog/SmsLog and fail open (log as FAILED,
// don't throw) when the provider isn't configured, so this route behaves
// correctly whether or not real keys are set.
//
// THROTTLING: EMAIL campaigns respect the connected mailbox's real daily
// sending cap (see lib/emailThrottle.ts) - a campaign larger than today's
// remaining allowance sends what it can now and leaves the rest queued as
// CampaignQueueItem rows with the campaign left in SENDING status;
// /api/campaigns/process-queue (a scheduled job, same CRON_SECRET pattern as
// automations/process-scheduled) resumes it on subsequent days until it's
// fully sent. SMS isn't throttled here - Twilio doesn't carry a comparable
// per-mailbox daily cap.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const campaign = await db.campaign.findFirst({ where: { id: params.id, companyId: ctx.company.id, deletedAt: null } });
  if (!campaign) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (campaign.status === "SENT") return NextResponse.json({ error: "This campaign was already sent." }, { status: 400 });

  if (campaign.status === "DRAFT") {
    const recipients = await db.customer.findMany({
      where: {
        companyId: ctx.company.id,
        deletedAt: null,
        ...(campaign.audience === "SPECIFIC_CUSTOMERS" ? { id: { in: campaign.recipientCustomerIds as unknown as string[] } } : {}),
        ...(campaign.audience === "ACTIVE_LEADS" ? { leads: { some: { pipelineStage: { notIn: ["WON", "LOST"] } } } } : {}),
        ...(campaign.audience === "PAST_CUSTOMERS" ? { jobs: { some: { status: { in: ["COMPLETE", "CLOSED"] } } } } : {})
      },
      select: { id: true }
    });

    await db.campaignQueueItem.createMany({
      data: recipients.map((c) => ({ campaignId: campaign.id, companyId: ctx.company.id, customerId: c.id }))
    });
    await db.campaign.update({ where: { id: campaign.id }, data: { recipientCount: recipients.length } });
  }

  const pending = await db.campaignQueueItem.findMany({ where: { campaignId: campaign.id, status: "PENDING" } });

  let toSendNow = pending;
  if (campaign.channel === "EMAIL") {
    const allowance = await getRemainingSendAllowance(ctx.company.id);
    if (allowance !== null) toSendNow = pending.slice(0, allowance);
  }

  const customers = await db.customer.findMany({
    where: { id: { in: toSendNow.map((p) => p.customerId) } },
    select: { id: true, name: true, email: true, phone: true }
  });
  const customerMap = new Map(customers.map((c) => [c.id, c]));

  let delivered = 0;
  let failed = 0;

  for (const item of toSendNow) {
    const customer = customerMap.get(item.customerId);
    if (!customer) {
      failed++;
      await db.campaignQueueItem.update({ where: { id: item.id }, data: { status: "FAILED" } });
      continue;
    }
    if (campaign.channel === "EMAIL") {
      if (!customer.email) {
        failed++;
        await db.campaignQueueItem.update({ where: { id: item.id }, data: { status: "FAILED" } });
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
      if (result.sent) {
        delivered++;
        await db.campaignQueueItem.update({ where: { id: item.id }, data: { status: "SENT", sentAt: new Date() } });
      } else {
        failed++;
        await db.campaignQueueItem.update({ where: { id: item.id }, data: { status: "FAILED" } });
      }
    } else {
      if (!customer.phone) {
        failed++;
        await db.campaignQueueItem.update({ where: { id: item.id }, data: { status: "FAILED" } });
        continue;
      }
      const result = await sendTrackedSms({
        companyId: ctx.company.id,
        customerId: customer.id,
        toPhone: customer.phone,
        body: campaign.message,
        kind: "campaign"
      });
      if (result.sent) {
        delivered++;
        await db.campaignQueueItem.update({ where: { id: item.id }, data: { status: "SENT", sentAt: new Date() } });
      } else {
        failed++;
        await db.campaignQueueItem.update({ where: { id: item.id }, data: { status: "FAILED" } });
      }
    }
  }

  const stillPending = await db.campaignQueueItem.count({ where: { campaignId: campaign.id, status: "PENDING" } });

  const updated = await db.campaign.update({
    where: { id: campaign.id },
    data: {
      status: stillPending > 0 ? "SENDING" : "SENT",
      sentAt: stillPending > 0 ? campaign.sentAt : new Date(),
      deliveredCount: { increment: delivered },
      failedCount: { increment: failed }
    }
  });

  return NextResponse.json({ ...updated, queuedForLater: stillPending });
}
