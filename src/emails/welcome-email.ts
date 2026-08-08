// Sent once, at signup, via lib/platformEmail.ts (TAKTCO's own platform
// email, not a tenant's connected account - see that file's header for why
// this is a legitimate, separate case from the no-fallback rule for
// tenant-to-customer sends).
export function welcomeEmail({ companyName, ownerName, appUrl }: { companyName: string; ownerName: string; appUrl: string }) {
  return {
    subject: `Welcome to TAKTCO, ${ownerName}`,
    html: `
      <div style="font-family: sans-serif; background:#0E0F11; color:#DDE0E4; padding:32px; max-width:560px; margin:0 auto;">
        <h1 style="color:#fff; margin-bottom:4px;">Welcome to TAKTCO</h1>
        <p style="color:#8A8F98; font-size:12px; text-transform:uppercase; letter-spacing:0.2em; margin-top:0;">Beyond The Tape</p>
        <p>Hi ${ownerName}, your workspace for <strong>${companyName}</strong> is live. Here's the fastest path to your first real estimate:</p>

        <div style="background:#16181C; border-radius:8px; padding:20px; margin:20px 0;">
          <p style="margin:0 0 12px; color:#fff; font-weight:600;">1. Build your Pricing Matrix</p>
          <p style="margin:0 0 16px; font-size:14px;">Load a starter template for your trade, or build your own — this is what the AI Estimate Builder uses to price real jobs, never a guess.</p>

          <p style="margin:0 0 12px; color:#fff; font-weight:600;">2. Connect your email</p>
          <p style="margin:0 0 16px; font-size:14px;">Gmail, Outlook, or Resend — takes a couple of minutes in Settings → Notifications. Nothing sends to your customers until this is done.</p>

          <p style="margin:0 0 12px; color:#fff; font-weight:600;">3. Add your first customer, then build an estimate</p>
          <p style="margin:0; font-size:14px;">Try the ✨ AI Builder — describe the job in plain language and get a real, priced draft from your own Pricing Matrix.</p>
        </div>

        <a href="${appUrl}/dashboard" style="display:inline-block; background:#1EAEC4; color:#0E0F11; padding:10px 20px; border-radius:6px; text-decoration:none; font-weight:600;">Go to your dashboard</a>

        <p style="color:#8A8F98; font-size:12px; margin-top:32px;">Your trial runs 7 days, no card needed. Questions? Just reply to this email.</p>
      </div>
    `
  };
}
