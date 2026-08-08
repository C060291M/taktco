// Platform-level system email - deliberately separate from
// services/resend.ts, which handles tenant-to-customer sends and has no
// shared fallback by design (a tenant's estimates/invoices/campaigns must
// go through THEIR OWN connected Gmail/Outlook/Resend/Twilio, never yours).
//
// This file is for the opposite direction: TAKTCO-the-platform's own
// system emails TO a signup (welcome emails now; could extend to things
// like "your trial is ending" later). That's normal platform behavior,
// the same way any SaaS sends its own onboarding email using its own
// infrastructure - it is NOT the removed fallback, and must never be used
// for anything a tenant sends to their own customers.
//
// Requires a real RESEND_API_KEY set as a platform env var in Railway
// (separate from any tenant's own CompanyCommsSettings). If it's not set,
// this fails silently with a logged error rather than crashing signup -
// a missing welcome email should never block someone from creating an
// account.
import { Resend } from "resend";
import { logError } from "@/lib/errorLog";

const platformResend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const PLATFORM_FROM = process.env.PLATFORM_FROM_ADDRESS || "TAKTCO <onboarding@resend.dev>";

export async function sendPlatformSystemEmail(params: { toEmail: string; subject: string; html: string; companyId?: string }) {
  if (!platformResend) {
    await logError({
      companyId: params.companyId,
      module: "EMAIL",
      severity: "LOW",
      message: "Platform system email not sent - RESEND_API_KEY not configured for platform use.",
      recoveryAction: "Set RESEND_API_KEY in Railway to enable welcome emails and other platform system email."
    });
    return { sent: false };
  }

  try {
    const result = await platformResend.emails.send({ from: PLATFORM_FROM, to: params.toEmail, subject: params.subject, html: params.html });
    if (result.error) {
      await logError({
        companyId: params.companyId,
        module: "EMAIL",
        severity: "LOW",
        message: `Platform system email rejected: ${result.error.message}`,
        recoveryAction: "Not retried - system emails are best-effort, never block the action that triggered them."
      });
      return { sent: false };
    }
    return { sent: true };
  } catch (err) {
    await logError({
      companyId: params.companyId,
      module: "EMAIL",
      severity: "LOW",
      message: `Platform system email failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      recoveryAction: "Not retried - system emails are best-effort, never block the action that triggered them."
    });
    return { sent: false };
  }
}
