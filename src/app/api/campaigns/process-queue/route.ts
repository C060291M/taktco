import { NextRequest, NextResponse } from "next/server";
import { db } from "@/database/client";
import { sendTrackedEmail } from "@/services/resend";
import { sendTrackedSms } from "@/services/twilio";
import { brandedEmail } from "@/emails/brandedEmail";
import { getRemainingSendAllowance } from "@/lib/emailThrottle";

// Resumes any campaign left in SENDING status - one that had more
// recipients than the connected mailbox's daily sending cap allowed to go
// out in one run (see lib/emailThrottle.ts). Needs a real scheduled trigger
// in production (Railway cron or any external scheduler hitting this URL),
// protected by CRON_SECRET so it can't be triggered by anyone who finds it.
//
// CONCURRENCY: each recipient row is CLAIMED before its message is sent -
// flipped PENDING->SENDING via updateMany guarded on `status: "PENDING"`,
// which Postgres applies atomically. If two runs overlap, only one can win
// a given recipient; the other's updateMany matches zero rows and it skips
// them. Without this, both runs would read the same PENDING rows and send
// the entire campaign to every recipient twice.
//
// The intermediate SENDING state (rather than claiming straight to SENT)
// means a send that then fails is still recorded as FAILED and stays
// visible, instead of being silently marked delivered.
const CONCURRENCY = 5;

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sendingCampaigns = await db.campaign.findMany({ where: { status: "SENDING" } });

  let campaignsProcessed = 0;
  let totalSent = 0;

  for (const campaign of sendingCampaigns) {
    const pending = await db.campaignQueueItem.findMany({
      where: { campaignId: campaign.id, status: "PENDING" },
      select: { id: true, customerId: true }
    });
    if (pending.length === 0) {
      await db.campaign.update({ where: { id: campaign.id }, data: { status: "SENT", sentAt: new Date() } });
      continue;
    }

    let candidates = pending;
    if (campaign.channel === "EMAIL") {
      const allowance = await getRemainingSendAllowance(campaign.companyId);
      if (allowance !== null) candidates = pending.slice(0, allowance);
      if (candidates.length === 0) continue;
    }

    const company = await db.company.findUnique({ where: { id: campaign.companyId } });
    if (!company) continue;

    // Claim each candidate atomically - only rows still PENDING are won.
    const claimed: { id: string; customerId: string }[] = [];
    for (const candidate of candidates) {
      const result = await db.campaignQueueItem.updateMany({
        where: { id: candidate.id, status: "PENDING" },
        data: { status: "SENDING" }
      });
      if (result.count === 1) claimed.push(candidate);
    }
    if (claimed.length === 0) continue;

    const customers = await db.customer.findMany({
      where: { id: { in: claimed.map(function (c) { return c.customerId; }) } },
      select: { id: true, name: true, email: true, phone: true }
    });
    const customerMap = new Map(customers.map(function (c) { return [c.id, c]; }));

    let delivered = 0;
    let failed = 0;

    for (let i = 0; i < claimed.length; i += CONCURRENCY) {
      const slice = claimed.slice(i, i + CONCURRENCY);
      const results = await Promise.all(
        slice.map(async function (item) {
          const customer = customerMap.get(item.customerId);
          try {
            if (!customer) return false;

            if (campaign.channel === "EMAIL") {
              if (!customer.email) return false;
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
              return result.sent;
            }

            if (!customer.phone) return false;
            const result = await sendTrackedSms({
              companyId: company.id,
              customerId: customer.id,
              toPhone: customer.phone,
              body: campaign.message,
              kind: "campaign"
            });
            return result.sent;
          } catch {
            return false;
          }
        })
      );

      for (let j = 0; j < slice.length; j++) {
        const sent = results[j];
        await db.campaignQueueItem.update({
          where: { id: slice[j].id },
          data: sent ? { status: "SENT", sentAt: new Date() } : { status: "FAILED" }
        });
        if (sent) delivered++;
        else failed++;
      }
    }

    const stillPending = await db.campaignQueueItem.count({ where: { campaignId: campaign.id, status: { in: ["PENDING", "SENDING"] } } });
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