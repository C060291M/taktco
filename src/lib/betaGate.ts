import { db } from "@/database/client";
import { isBetaExpired } from "@/lib/betaStatus";

// Outbound-message gate for closed-beta accounts whose beta has ended. Unlike the
// middleware this can query the database, so it applies immediately and also covers
// sends that never pass through a user request (campaign queue, automations,
// scheduled notifications). Any lookup error fails open, never blocking a send.
export const BETA_SEND_BLOCKED_REASON =
  "This account's closed beta has ended and the account is read-only, so outgoing messages are paused. Contact us to extend your beta.";

// Automatic confirmations of something a customer just did, and internal staff
// notifications. Anything not listed here is blocked once the beta has ended.
const EMAIL_KINDS_ALLOWED_WHEN_EXPIRED = new Set([
  "change_order_approved_confirmation",
  "change_order_approved_company_copy",
  "contract_signed_confirmation",
  "contract_signed_company_copy",
  "estimate_approved_confirmation",
  "estimate_approved_company_copy",
  "invoice_paid_confirmation",
  "invoice_paid_company_copy",
  "notification"
]);
const SMS_KINDS_ALLOWED_WHEN_EXPIRED = new Set(["notification"]);

async function companyBetaExpired(companyId: string): Promise<boolean> {
  try {
    const company = await db.company.findUnique({ where: { id: companyId }, select: { betaEndsAt: true } });
    return isBetaExpired(company?.betaEndsAt);
  } catch {
    return false;
  }
}

export async function emailBlockedByBeta(companyId: string, kind: string): Promise<boolean> {
  if (EMAIL_KINDS_ALLOWED_WHEN_EXPIRED.has(kind)) return false;
  return companyBetaExpired(companyId);
}

export async function smsBlockedByBeta(companyId: string, kind: string): Promise<boolean> {
  if (SMS_KINDS_ALLOWED_WHEN_EXPIRED.has(kind)) return false;
  return companyBetaExpired(companyId);
}