import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/client";
import { sendTrackedEmail } from "@/services/resend";
import { sendTrackedSms } from "@/services/twilio";
import { brandedEmail } from "@/emails/brandedEmail";
import { getRemainingSendAllowance } from "@/lib/emailThrottle";

// Resumes any campaign left in SENDING status - one that had more
// recipients than the connected mailbox's daily sending cap allowed to go
// out in one run (see lib/emailThrottle.ts). Needs a real scheduled trigger
// in production (Railway's cron plugin, or any external cron service hitting
// this URL once a day, e.g. every morning) - nothing calls this
// automatically yet, same as automations/process-scheduled. Protected by
// CRON_SECRET so it can''t be triggered by anyone who finds the URL.
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sendingCampaigns = await db.campaign.findMany({ where: { status: "SENDING" } });

  let campaignsProcessed = 0;
  let totalSent = 0;

  for (const campaign of sendingCampaigns) {
    const pending = await db.campaignQueueItem.findMany({ where: { campaignId: campaign.id, status: "PENDING" } });
    if (pending.length === 0) {
      await db.campaign.update({ where: { id: campaign.id }, data: { status: "SENT", sentAt: new Date() } });
      continue;
    }

    let toSendNow = pending;
    if (campaign.channel === "EMAIL") {
      const allowance = await getRemainingSendAllowance(campaign.companyId);
      if (allowance !== null) toSendNow = pending.slice(0, allowance);
      if (toSendNow.length === 0) continue;
    }

    const company = await db.company.findUnique({ where: { id: campaign.companyId } });
    if (!company) continue;

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
          companyName: company.name,
          logoUrl: company.logoUrl,
          accentColor: company.brandAccentColor,
          heading: campaign.subject || campaign.name,
          bodyHtml: campaign.message.replace(/\n/g, "<br/>")
        });
        const result = await sendTrackedEmail({
          companyId: company.id,
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
          companyId: company.id,
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
    await db.campaign.update({
      where: { id: campaign.id },
      data: {
        status: stillPending > 0 ? "SENDING" : "SENT",
        sentAt: stillPending > 0 ? campaign.sentAt : new Date(),
        deliveredCount: { increment: delivered },
        failedCount: { increment: failed }
      }
    });

    campaignsProcessed++;
    totalSent += delivered;
  }

  return NextResponse.json({ campaignsProcessed, totalSent });
}
