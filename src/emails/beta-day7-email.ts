import { CONTACT_EMAIL } from "@/lib/contact";

// Sent once, about 7 days after a closed-beta signup, by the daily job in
// api/beta/send-ending-notices/route.ts via lib/platformEmail.ts.
export function betaDay7Email({ ownerName, companyName, endDate, appUrl }: { ownerName: string; companyName: string; endDate: string; appUrl: string }) {
  return {
    subject: `How is TAKTCO working for you, ${ownerName}?`,
    html: `
      <div style="font-family: sans-serif; background:#0E0F11; color:#DDE0E4; padding:32px; max-width:560px; margin:0 auto;">
        <h1 style="color:#fff; margin-bottom:4px;">We would love your feedback</h1>
        <p style="color:#8A8F98; font-size:12px; text-transform:uppercase; letter-spacing:0.2em; margin-top:0;">Beyond The Tape</p>
        <p>Hi ${ownerName}, you have had a week with TAKTCO for <strong>${companyName}</strong>, and your beta access runs through <strong>${endDate}</strong>. Your honest feedback is the most valuable thing you can give us right now.</p>
        <p>Just reply to this email with a few lines on any of these:</p>
        <div style="background:#16181C; border-radius:8px; padding:20px; margin:20px 0; font-size:14px;">
          <p style="margin:0 0 10px;">&bull; What has been the most useful part so far?</p>
          <p style="margin:0 0 10px;">&bull; What was confusing, slow, or did not work the way you expected?</p>
          <p style="margin:0;">&bull; What is missing that would make you use it every day?</p>
        </div>
        <p>Short and blunt is perfect. If it is easier, tell us about a bug or a rough edge as you hit it, and we will get on it.</p>
        <a href="${appUrl}/dashboard" style="display:inline-block; background:#1EAEC4; color:#0E0F11; padding:10px 20px; border-radius:6px; text-decoration:none; font-weight:600;">Open your dashboard</a>
        <p style="color:#8A8F98; font-size:12px; margin-top:32px;">Thank you for helping us build something better. Taktco &middot; <a href="mailto:${CONTACT_EMAIL}" style="color:#1EAEC4;">${CONTACT_EMAIL}</a></p>
      </div>
    `
  };
}