import { db } from "@/database/client";

// Daily recipient caps by provider, kept conservative (below the documented
// ceiling) to leave headroom for the account's own transactional email
// (estimates, invoices, review requests) which shares the same daily quota
// since it's the same real mailbox, not a per-app limit. Confirmed via
// Railway's own SMTP unblock (Pro plan) - this cap is a Gmail/Outlook
// mailbox limit, unrelated to and unaffected by Railway's plan or infra.
const DAILY_CAPS: Record<string, number> = {
  GMAIL: 450,
  OUTLOOK: 250
};

// Companies sending via Resend (HTTPS API, not a personal mailbox) aren't
// subject to a personal-mailbox daily cap in the same way, so they're
// deliberately excluded from throttling here - returns null (no cap).
export async function getDailySendCap(companyId: string): Promise<number | null> {
  const settings = await db.companyCommsSettings.findUnique({ where: { companyId } });
  if (!settings?.smtpProvider) return null;
  return DAILY_CAPS[settings.smtpProvider] ?? null;
}

// Counts real successful sends (not FAILED, not QUEUED) already made today
// across ALL email kinds - transactional and campaign both draw from the
// same real mailbox quota, so both must count against the same cap.
export async function getSentTodayCount(companyId: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  return db.emailLog.count({
    where: {
      companyId,
      createdAt: { gte: startOfDay },
      status: { in: ["SENT", "DELIVERED", "OPENED", "CLICKED"] }
    }
  });
}

// Returns how many more emails this company can safely send today, or null
// if there's no cap to enforce (Resend-connected, or nothing connected yet).
export async function getRemainingSendAllowance(companyId: string): Promise<number | null> {
  const cap = await getDailySendCap(companyId);
  if (cap === null) return null;
  const sentToday = await getSentTodayCount(companyId);
  return Math.max(0, cap - sentToday);
}
