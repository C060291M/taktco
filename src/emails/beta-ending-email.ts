// Sent once when a closed-beta account is within 3 days of its end date, via
// lib/platformEmail.ts (TAKTCO's own platform email, same as welcome-email.ts).
export function betaEndingEmail({ ownerName, companyName, endDate, appUrl }: { ownerName: string; companyName: string; endDate: string; appUrl: string }) {
  return {
    subject: `Your TAKTCO closed beta ends on ${endDate}`,
    html: `
      <div style="font-family: sans-serif; background:#0E0F11; color:#DDE0E4; padding:32px; max-width:560px; margin:0 auto;">
        <h1 style="color:#fff; margin-bottom:4px;">Your closed beta is ending soon</h1>
        <p style="color:#8A8F98; font-size:12px; text-transform:uppercase; letter-spacing:0.2em; margin-top:0;">Beyond The Tape</p>
        <p>Hi ${ownerName}, the closed beta for <strong>${companyName}</strong> ends on <strong>${endDate}</strong>.</p>
        <p>After that date your account becomes read-only: you can still log in and view all of your customers, estimates, projects, and invoices, but you will not be able to add, edit, or send anything.</p>
        <p>We would love to hear how the beta has gone for you. Reply to this email to tell us, and let us know if you would like more time.</p>
        <a href="${appUrl}/dashboard" style="display:inline-block; background:#1EAEC4; color:#0E0F11; padding:10px 20px; border-radius:6px; text-decoration:none; font-weight:600;">Open your dashboard</a>
        <p style="color:#8A8F98; font-size:12px; margin-top:32px;">Thank you for helping shape TAKTCO. Questions? Just reply to this email.</p>
      </div>
    `
  };
}