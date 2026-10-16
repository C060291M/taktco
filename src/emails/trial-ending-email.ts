import { CONTACT_EMAIL } from "@/lib/contact";

// Sent once when a free-trial account is within 2 days of its end date, via lib/platformEmail.ts
// (TAKTCO's own platform email, same as welcome-email.ts and beta-ending-email.ts).
export function trialEndingEmail({ ownerName, companyName, endDate, appUrl }: { ownerName: string; companyName: string; endDate: string; appUrl: string }) {
  return {
    subject: `Your TAKTCO free trial ends on ${endDate}`,
    html: `
      <div style="font-family: sans-serif; background:#0E0F11; color:#DDE0E4; padding:32px; max-width:560px; margin:0 auto;">
        <h1 style="color:#fff; margin-bottom:4px;">Your free trial is ending soon</h1>
        <p style="color:#8A8F98; font-size:12px; text-transform:uppercase; letter-spacing:0.2em; margin-top:0;">Beyond The Tape</p>
        <p>Hi ${ownerName}, the free trial for <strong>${companyName}</strong> ends on <strong>${endDate}</strong>.</p>
        <p>After that date your account becomes read-only: you can still log in and view all of your customers, estimates, projects, and invoices, but you will not be able to add, edit, or send anything.</p>
        <p>To keep working without interruption, choose a plan before then. Everything you have entered stays exactly as it is.</p>
        <a href="${appUrl}/settings/billing" style="display:inline-block; background:#1EAEC4; color:#0E0F11; padding:10px 20px; border-radius:6px; text-decoration:none; font-weight:600;">Choose a plan</a>
        <p style="color:#8A8F98; font-size:12px; margin-top:32px;">Questions or feedback? Reply to this email or write to <a href="mailto:${CONTACT_EMAIL}" style="color:#1EAEC4;">${CONTACT_EMAIL}</a>.</p>
      </div>
    `
  };
}