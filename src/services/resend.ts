// Real Resend integration for transactional email.
//
// STATUS: written against Resend's current SDK/API, never executed - no
// internet in this sandbox. Verify before trusting it:
// 1. `npm install resend` (already in package.json)
// 2. Set RESEND_API_KEY and a verified sending domain/FROM address in .env
// 3. Send one of each kind (estimate, contract, invoice, review request) to
//    a real inbox and confirm delivery before relying on this.
import { Resend } from "resend";
import { db } from "@/database/client";
import { logError } from "@/lib/errorLog";

export const resendConfigured = Boolean(process.env.RESEND_API_KEY);
const resend = resendConfigured ? new Resend(process.env.RESEND_API_KEY as string) : null;
const FROM_ADDRESS = process.env.RESEND_FROM_ADDRESS || "TAKTCO <onboarding@resend.dev>";

// Sends an email and logs it to EmailLog regardless of outcome, so delivery
// status is visible in the product even when Resend isn't configured yet
// (it just logs as FAILED with a clear reason instead of silently no-op-ing).
export async function sendTrackedEmail(params: {
  companyId: string;
  customerId?: string;
  toEmail: string;
  subject: string;
  html: string;
  kind: string;
}) {
  if (!resendConfigured || !resend) {
    await db.emailLog.create({
      data: {
        companyId: params.companyId,
        customerId: params.customerId,
        toEmail: params.toEmail,
        subject: params.subject,
        kind: params.kind,
        status: "FAILED",
        errorMessage: "RESEND_API_KEY not configured"
      }
    });
    return { sent: false, reason: "Email isn't configured yet (RESEND_API_KEY missing)." };
  }

  try {
    const result = await resend.emails.send({ from: FROM_ADDRESS, to: params.toEmail, subject: params.subject, html: params.html });
    await db.emailLog.create({
      data: {
        companyId: params.companyId,
        customerId: params.customerId,
        toEmail: params.toEmail,
        subject: params.subject,
        kind: params.kind,
        status: "SENT",
        resendId: result.data?.id
      }
    });
    return { sent: true };
  } catch (err) {
    await db.emailLog.create({
      data: {
        companyId: params.companyId,
        customerId: params.customerId,
        toEmail: params.toEmail,
        subject: params.subject,
        kind: params.kind,
        status: "FAILED",
        errorMessage: err instanceof Error ? err.message : "Unknown error"
      }
    });
    await logError({
      companyId: params.companyId,
      module: "EMAIL",
      severity: "LOW",
      message: `Email send failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      recoveryAction: "Logged to EmailLog as FAILED, no retry attempted."
    });
    return { sent: false, reason: "Send failed - see EmailLog for details." };
  }
}
