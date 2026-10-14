// Platform-level system email - deliberately separate from
// services/resend.ts, which handles tenant-to-customer sends and has no
// shared fallback by design (a tenant's estimates/invoices/campaigns must
// go through THEIR OWN connected Gmail/Outlook/Resend/Twilio, never yours).
//
// This file is for the opposite direction: TAKTCO-the-platform's own
// system emails TO a signup (welcome, password reset, closed-beta ending
// notice). That's normal platform behavior, the same way any SaaS sends its
// own onboarding email using its own infrastructure - it is NOT the removed
// fallback, and must never be used for anything a tenant sends to their own
// customers.
//
// Two ways to send, checked in this order:
//  1. Gmail SMTP, when PLATFORM_SMTP_USER and PLATFORM_SMTP_PASSWORD (a Gmail
//     app password) are set in Railway. Mail comes from that Gmail account, so
//     replies land in its inbox with no domain setup.
//  2. Resend, when RESEND_API_KEY is set. The default resend.dev sender only
//     delivers to the Resend account owner; sending to anyone else needs a
//     verified domain and PLATFORM_FROM_ADDRESS.
// If neither is configured this fails silently with a logged error rather than
// crashing signup - a missing welcome email should never block someone from
// creating an account.
import { Resend } from "resend";
import nodemailer from "nodemailer";
import { logError } from "@/lib/errorLog";
import { CONTACT_EMAIL } from "@/lib/contact";

const platformResend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const PLATFORM_FROM = process.env.PLATFORM_FROM_ADDRESS || "TAKTCO <onboarding@resend.dev>";

const smtpUser = process.env.PLATFORM_SMTP_USER;
const smtpPassword = process.env.PLATFORM_SMTP_PASSWORD;
const platformSmtp =
  smtpUser && smtpPassword
    ? nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false, // STARTTLS on 587, same as the tenant Gmail path in services/resend.ts
        connectionTimeout: 10000, // a stuck connection must never hold up signup
        greetingTimeout: 10000,
        socketTimeout: 15000,
        auth: { user: smtpUser, pass: smtpPassword }
      })
    : null;
const smtpFrom = smtpUser ? `TAKTCO <${smtpUser}>` : "";

export async function sendPlatformSystemEmail(params: { toEmail: string; subject: string; html: string; companyId?: string }) {
  if (platformSmtp) {
    try {
      await platformSmtp.sendMail({ from: smtpFrom, replyTo: CONTACT_EMAIL, to: params.toEmail, subject: params.subject, html: params.html });
      return { sent: true };
    } catch (err) {
      await logError({
        companyId: params.companyId,
        module: "EMAIL",
        severity: "LOW",
        message: `Platform system email failed (Gmail SMTP): ${err instanceof Error ? err.message : "Unknown error"}`,
        recoveryAction: "Not retried - system emails are best-effort, never block the action that triggered them."
      });
      return { sent: false };
    }
  }

  if (!platformResend) {
    await logError({
      companyId: params.companyId,
      module: "EMAIL",
      severity: "LOW",
      message: "Platform system email not sent - neither Gmail SMTP (PLATFORM_SMTP_USER/PLATFORM_SMTP_PASSWORD) nor RESEND_API_KEY is configured.",
      recoveryAction: "Set the Gmail variables or RESEND_API_KEY in Railway to enable welcome emails and other platform system email."
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