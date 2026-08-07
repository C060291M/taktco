// Real Resend integration for transactional email.
//
// STATUS: tested for real against live Resend. A real bug was found and
// fixed here: the SDK can return a rejected send as { error: {...} }
// instead of throwing, which this code originally didn't check for. Also
// confirmed directly: Resend's shared resend.dev sending domain can only
// deliver to the single email address your Resend account was signed up
// with - sending to any other address is rejected. Verify a real domain
// (Resend → Domains) before this can email real customers.
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

    // The Resend SDK doesn't always throw on a rejected send - it can return
    // { data: null, error: {...} } instead (this is exactly what happens
    // when sending to an address other than your own account's email while
    // using the shared resend.dev domain). Checking only try/catch missed
    // this entirely and logged rejected sends as successful - real bug,
    // caught by actually testing against live Resend rather than assuming
    // the written code was correct.
    if (result.error) {
      await db.emailLog.create({
        data: {
          companyId: params.companyId,
          customerId: params.customerId,
          toEmail: params.toEmail,
          subject: params.subject,
          kind: params.kind,
          status: "FAILED",
          errorMessage: result.error.message || "Resend rejected the send."
        }
      });
      await logError({
        companyId: params.companyId,
        module: "EMAIL",
        severity: "LOW",
        message: `Email send rejected by Resend: ${result.error.message}`,
        recoveryAction: "Logged to EmailLog as FAILED. If using the shared resend.dev domain, note it can only deliver to the email address your Resend account was signed up with - verify a real domain for sending to other recipients."
      });
      return { sent: false, reason: result.error.message || "Resend rejected the send." };
    }

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
