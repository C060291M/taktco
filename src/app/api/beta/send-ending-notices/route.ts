import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/database/client";
import { sendPlatformSystemEmail } from "@/lib/platformEmail";
import { betaEndingEmail } from "@/emails/beta-ending-email";

const DAY_MS = 24 * 60 * 60 * 1000;
const NOTICE_WINDOW_DAYS = 3;

function secretMatches(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Called once a day by .github/workflows/beta-ending-notices.yml. Emails each owner
// once when their beta ends within NOTICE_WINDOW_DAYS. A company is only marked as
// notified after the email actually sends, so a failed send is retried tomorrow.
// Unlike the campaign endpoint, this refuses to run at all if CRON_SECRET is not set.
export async function POST(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 503 });
  if (!secretMatches(req.headers.get("x-cron-secret"), expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const windowEnd = new Date(now.getTime() + NOTICE_WINDOW_DAYS * DAY_MS);
  const due = await db.company.findMany({
    where: { betaEnrolledAt: { not: null }, betaWarningSentAt: null, betaEndsAt: { gt: now, lte: windowEnd } },
    select: {
      id: true,
      name: true,
      betaEndsAt: true,
      users: { where: { role: "OWNER" }, orderBy: { createdAt: "asc" }, take: 1, select: { name: true, email: true } }
    }
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  let sent = 0;
  for (const company of due) {
    const owner = company.users[0];
    if (!owner || !company.betaEndsAt) continue;
    const endDate = company.betaEndsAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/Chicago" });
    const content = betaEndingEmail({ ownerName: owner.name, companyName: company.name, endDate, appUrl });
    const result = await sendPlatformSystemEmail({ toEmail: owner.email, subject: content.subject, html: content.html, companyId: company.id });
    if (result.sent) {
      await db.company.update({ where: { id: company.id }, data: { betaWarningSentAt: now } });
      sent++;
    }
  }
  return NextResponse.json({ checked: due.length, sent });
}