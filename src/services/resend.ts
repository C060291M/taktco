// Real email sending - two paths, both fully owned by the company, never
// TAKTCO's shared account.
//
// STATUS: SMTP path is new and hasn't been executed against a real Gmail/
// Outlook inbox yet - verify with a real test send before trusting it the
// way the Resend path (tested tonight, including a real bug found and
// fixed) has already been verified. The Resend path stays available as an
// advanced/alternate option for companies that already have their own
// Resend account.
//
// IMPORTANT CHANGE: there is deliberately no platform-wide fallback anymore.
// If a company hasn't connected their own email (either path), sending
// fails cleanly with a clear reason logged to EmailLog - it never silently
// uses TAKTCO's own account on their behalf.
import { Resend } from "resend";
import nodemailer from "nodemailer";
import { db } from "@/database/client";
import { logError } from "@/lib/errorLog";
import { decryptSecret } from "@/lib/crypto";

const SMTP_PRESETS: Record<string, { host: string; port: number }> = {
  GMAIL: { host: "smtp.gmail.com", port: 587 },
  OUTLOOK: { host: "smtp-mail.outlook.com", port: 587 }
};

type Sender =
  | { kind: "smtp"; transporter: nodemailer.Transporter; fromAddress: string }
  | { kind: "resend"; client: Resend; fromAddress: string };

async function getSenderForCompany(companyId: string): Promise<Sender | null> {
  const settings = await db.companyCommsSettings.findUnique({ where: { companyId } });
  if (!settings) return null;

  // SMTP (Gmail/Outlook) is the simple, primary path - checked first.
  if (settings.smtpProvider && settings.smtpUser && settings.encryptedSmtpPassword) {
    const preset = SMTP_PRESETS[settings.smtpProvider];
    if (preset) {
      try {
        const password = decryptSecret(settings.encryptedSmtpPassword);
        const transporter = nodemailer.createTransport({
          host: preset.host,
          port: preset.port,
          secure: false, // STARTTLS on 587, not implicit TLS
          auth: { user: settings.smtpUser, pass: password }
        });
        const fromName = settings.smtpFromName || settings.smtpUser;
        return { kind: "smtp", transporter, fromAddress: `${fromName} <${settings.smtpUser}>` };
      } catch {
        // Falls through to Resend below if decryption fails for any reason.
      }
    }
  }

  // Resend - advanced/alternate path.
  if (settings.encryptedResendApiKey) {
    try {
      const key = decryptSecret(settings.encryptedResendApiKey);
      return { kind: "resend", client: new Resend(key), fromAddress: settings.resendFromAddress || settings.smtpUser || "" };
    } catch {
      // No further fallback - see file header.
    }
  }

  return null;
}

// Sends an email and logs it to EmailLog regardless of outcome, so delivery
// status is visible in the product even when nothing's connected yet (it
// just logs as FAILED with a clear reason instead of silently no-op-ing).
export async function sendTrackedEmail(params: {
  companyId: string;
  customerId?: string;
  toEmail: string;
  subject: string;
  html: string;
  kind: string;
  attachments?: { filename: string; content: Buffer }[];
}) {
  const sender = await getSenderForCompany(params.companyId);
  if (!sender) {
    await db.emailLog.create({
      data: {
        companyId: params.companyId,
        customerId: params.customerId,
        toEmail: params.toEmail,
        subject: params.subject,
        kind: params.kind,
        status: "FAILED",
        errorMessage: "No email connected - connect Gmail, Outlook, or Resend in Settings -> Notifications."
      }
    });
    return { sent: false, reason: "Email isn't connected yet. Connect it in Settings -> Notifications." };
  }

  try {
    if (sender.kind === "smtp") {
      const info = await sender.transporter.sendMail({
        from: sender.fromAddress,
        to: params.toEmail,
        subject: params.subject,
        html: params.html,
        attachments: params.attachments
      });
      await db.emailLog.create({
        data: {
          companyId: params.companyId,
          customerId: params.customerId,
          toEmail: params.toEmail,
          subject: params.subject,
          kind: params.kind,
          status: "SENT",
          resendId: info.messageId
        }
      });
      return { sent: true };
    }

    // Resend path - the SDK doesn't always throw on a rejected send, it can
    // return { data: null, error: {...} } instead. Real bug found and fixed
    // tonight by testing against live Resend - checked explicitly here.
    const result = await sender.client.emails.send({ from: sender.fromAddress, to: params.toEmail, subject: params.subject, html: params.html, attachments: params.attachments?.map(a => ({ filename: a.filename, content: a.content })) });
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
        recoveryAction: "Logged to EmailLog as FAILED."
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



