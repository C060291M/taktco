import { CONTACT_EMAIL } from "@/lib/contact";

// Sent once, about 3 days after a closed-beta signup, by the daily job in
// api/beta/send-ending-notices/route.ts via lib/platformEmail.ts.
export function betaDay3Email({ ownerName, companyName, appUrl }: { ownerName: string; companyName: string; appUrl: string }) {
  return {
    subject: `Need a hand getting ${companyName} set up on TAKTCO?`,
    html: `
      <div style="font-family: sans-serif; background:#0E0F11; color:#DDE0E4; padding:32px; max-width:560px; margin:0 auto;">
        <h1 style="color:#fff; margin-bottom:4px;">How is the setup going?</h1>
        <p style="color:#8A8F98; font-size:12px; text-transform:uppercase; letter-spacing:0.2em; margin-top:0;">Beyond The Tape</p>
        <p>Hi ${ownerName}, it has been a few days since you joined the TAKTCO closed beta. We wanted to check in and see if you need any help getting <strong>${companyName}</strong> set up.</p>
        <p>If you are not sure where to start, these three steps get most people to a real estimate the fastest:</p>
        <div style="background:#16181C; border-radius:8px; padding:20px; margin:20px 0; font-size:14px;">
          <p style="margin:0 0 10px;"><strong style="color:#fff;">1. Build your Pricing Matrix</strong> in Settings. Load a starter template for your trade, then adjust the prices to match yours.</p>
          <p style="margin:0 0 10px;"><strong style="color:#fff;">2. Connect your email</strong> in Settings &rarr; Notifications, so estimates and invoices go out from you.</p>
          <p style="margin:0;"><strong style="color:#fff;">3. Add a customer and build your first estimate.</strong> The AI Builder can draft it for you from your Pricing Matrix.</p>
        </div>
        <p>Stuck on something, or something not working the way you expected? Just reply to this email and tell us what you are trying to do, and we will walk you through it.</p>
        <p style="font-size:13px; color:#B4B8C0;">One reminder: online card payments are still in test mode, so for now collect payment the way you normally do and use <strong>Mark as paid</strong> on the invoice.</p>
        <a href="${appUrl}/dashboard" style="display:inline-block; background:#1EAEC4; color:#0E0F11; padding:10px 20px; border-radius:6px; text-decoration:none; font-weight:600;">Open your dashboard</a>
        <p style="color:#8A8F98; font-size:12px; margin-top:32px;">Taktco &middot; <a href="mailto:${CONTACT_EMAIL}" style="color:#1EAEC4;">${CONTACT_EMAIL}</a></p>
      </div>
    `
  };
}