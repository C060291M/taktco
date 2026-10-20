import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/database/client";
import { sendPlatformSystemEmail } from "@/lib/platformEmail";
import { betaEndingEmail } from "@/emails/beta-ending-email";
import { trialEndingEmail } from "@/emails/trial-ending-email";
import { betaDay3Email } from "@/emails/beta-day3-email";
import { betaDay7Email } from "@/emails/beta-day7-email";
import { isPaidStatus } from "@/lib/accountAccess";

const DAY_MS = 24 * 60 * 60 * 1000;
const BETA_NOTICE_WINDOW_DAYS = 3;
const TRIAL_NOTICE_WINDOW_DAYS = 2;

function secretMatches(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function dateLabel(d: Date) {
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/Chicago" });
}

// Called once a day by .github/workflows/beta-ending-notices.yml. Emails each owner once when their
// closed beta ends within BETA_NOTICE_WINDOW_DAYS, or their free trial within TRIAL_NOTICE_WINDOW_DAYS.
// Companies with an active subscription are skipped. A company is only marked as notified after the
// email actually sends, so a failed send is retried tomorrow. Unlike the campaign endpoint, this
// refuses to run at all if CRON_SECRET is not set.
export async function POST(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 503 });
  if (!secretMatches(req.headers.get("x-cron-secret"), expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  const ownerSelect = { where: { role: "OWNER" }, orderBy: { createdAt: "asc" }, take: 1, select: { name: true, email: true } } as const;

  // Closed beta
  const betaDue = await db.company.findMany({
    where: {
      betaEnrolledAt: { not: null },
      betaWarningSentAt: null,
      betaEndsAt: { gt: now, lte: new Date(now.getTime() + BETA_NOTICE_WINDOW_DAYS * DAY_MS) }
    },
    select: { id: true, name: true, betaEndsAt: true, subscriptionStatus: true, users: ownerSelect }
  });
  let betaSent = 0;
  for (const company of betaDue) {
    const owner = company.users[0];
    if (!owner || !company.betaEndsAt || isPaidStatus(company.subscriptionStatus)) continue;
    const content = betaEndingEmail({ ownerName: owner.name, companyName: company.name, endDate: dateLabel(company.betaEndsAt), appUrl });
    const result = await sendPlatformSystemEmail({ toEmail: owner.email, subject: content.subject, html: content.html, companyId: company.id });
    if (result.sent) {
      await db.company.update({ where: { id: company.id }, data: { betaWarningSentAt: now } });
      betaSent++;
    }
  }

  // Free trial (a company in the closed beta is handled above, so it is excluded here)
  const trialDue = await db.company.findMany({
    where: {
      betaEnrolledAt: null,
      trialWarningSentAt: null,
      trialEndsAt: { gt: now, lte: new Date(now.getTime() + TRIAL_NOTICE_WINDOW_DAYS * DAY_MS) }
    },
    select: { id: true, name: true, trialEndsAt: true, subscriptionStatus: true, users: ownerSelect }
  });
  let trialSent = 0;
  for (const company of trialDue) {
    const owner = company.users[0];
    if (!owner || !company.trialEndsAt || isPaidStatus(company.subscriptionStatus)) continue;
    const content = trialEndingEmail({ ownerName: owner.name, companyName: company.name, endDate: dateLabel(company.trialEndsAt), appUrl });
    const result = await sendPlatformSystemEmail({ toEmail: owner.email, subject: content.subject, html: content.html, companyId: company.id });
    if (result.sent) {
      await db.company.update({ where: { id: company.id }, data: { trialWarningSentAt: now } });
      trialSent++;
    }
  }

  // Closed-beta follow-ups: day 3 "need help?" and day 7 "feedback". Each is sent once per company, only
  // while the beta is still running, and only inside a bounded window so an older account never gets a late
  // day-3 email and a day-7 email back to back.
  const day3Due = await db.company.findMany({
    where: {
      betaDay3EmailSentAt: null,
      betaEndsAt: { gt: now },
      betaEnrolledAt: { not: null, lte: new Date(now.getTime() - 3 * DAY_MS), gt: new Date(now.getTime() - 6 * DAY_MS) }
    },
    select: { id: true, name: true, users: ownerSelect }
  });
  let day3Sent = 0;
  for (const company of day3Due) {
    const owner = company.users[0];
    if (!owner) continue;
    const content = betaDay3Email({ ownerName: owner.name, companyName: company.name, appUrl });
    const result = await sendPlatformSystemEmail({ toEmail: owner.email, subject: content.subject, html: content.html, companyId: company.id });
    if (result.sent) {
      await db.company.update({ where: { id: company.id }, data: { betaDay3EmailSentAt: now } });
      day3Sent++;
    }
  }

  const day7Due = await db.company.findMany({
    where: {
      betaDay7EmailSentAt: null,
      betaEndsAt: { gt: now },
      betaEnrolledAt: { not: null, lte: new Date(now.getTime() - 7 * DAY_MS), gt: new Date(now.getTime() - 10 * DAY_MS) }
    },
    select: { id: true, name: true, betaEndsAt: true, users: ownerSelect }
  });
  let day7Sent = 0;
  for (const company of day7Due) {
    const owner = company.users[0];
    if (!owner || !company.betaEndsAt) continue;
    const content = betaDay7Email({ ownerName: owner.name, companyName: company.name, endDate: dateLabel(company.betaEndsAt), appUrl });
    const result = await sendPlatformSystemEmail({ toEmail: owner.email, subject: content.subject, html: content.html, companyId: company.id });
    if (result.sent) {
      await db.company.update({ where: { id: company.id }, data: { betaDay7EmailSentAt: now } });
      day7Sent++;
    }
  }

  return NextResponse.json({ checked: betaDue.length, sent: betaSent, trialChecked: trialDue.length, trialSent, day3Sent, day7Sent });
}
