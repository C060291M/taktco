import { db } from "@/database/client";
import { accessExpired, accessInfo } from "@/lib/accountAccess";

// Outbound-message gate for accounts whose closed beta or free trial has ended (read-only accounts).
// Unlike the middleware this can query the database, so it applies immediately and also covers
// sends that never pass through a user request (campaign queue, automations, scheduled
// notifications). Paid accounts are never blocked. Any lookup error fails open, never blocking a
// send. The exported names say "Beta" for historical reasons; they cover trials too.
export const BETA_SEND_BLOCKED_REASON =
  "This account's closed beta or free trial has ended and the account is read-only, so outgoing messages are paused.";

// Automatic confirmations of something a customer just did, and internal staff
// notifications. Anything not listed here is blocked once the account is read-only.
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

async function companyAccessExpired(companyId: string): Promise<boolean> {
  try {
    const company = await db.company.findUnique({
      where: { id: companyId },
      select: { subscriptionStatus: true, betaEnrolledAt: true, betaEndsAt: true, trialEndsAt: true }
    });
    return accessExpired(accessInfo(company));
  } catch {
    return false;
  }
}

export async function emailBlockedByBeta(companyId: string, kind: string): Promise<boolean> {
  if (EMAIL_KINDS_ALLOWED_WHEN_EXPIRED.has(kind)) return false;
  return companyAccessExpired(companyId);
}

export async function smsBlockedByBeta(companyId: string, kind: string): Promise<boolean> {
  if (SMS_KINDS_ALLOWED_WHEN_EXPIRED.has(kind)) return false;
  return companyAccessExpired(companyId);
}