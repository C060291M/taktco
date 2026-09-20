// Sent when a user requests a password reset, via lib/platformEmail.ts
// (TAKTCO's own platform email, not a tenant's connected account - see
// that file's header for why this is a legitimate, separate case from the
// no-fallback rule for tenant-to-customer sends). Same reasoning as
// welcome-email.ts - this goes to a staff user of a company, not to that
// company's own customer, so it always uses TAKTCO's own platform brand,
// never the tenant's logo/accent color.
export function passwordResetEmail({ name, resetUrl }: { name: string; resetUrl: string }) {
  return {
    subject: "Reset your TAKTCO password",
    html: `
      <div style="font-family: sans-serif; background:#0E0F11; color:#DDE0E4; padding:32px; max-width:560px; margin:0 auto;">
        <h1 style="color:#fff; margin-bottom:4px;">Reset your password</h1>
        <p style="color:#8A8F98; font-size:12px; text-transform:uppercase; letter-spacing:0.2em; margin-top:0;">Beyond The Tape</p>
        <p>Hi ${name}, we received a request to reset your TAKTCO password. Click below to choose a new one - this link expires in 1 hour.</p>

        <a href="${resetUrl}" style="display:inline-block; background:#1EAEC4; color:#0E0F11; padding:10px 20px; border-radius:6px; text-decoration:none; font-weight:600; margin:16px 0;">Reset password</a>

        <p style="color:#8A8F98; font-size:12px; margin-top:32px;">If you did not request this, you can safely ignore this email - your password will not be changed.</p>
      </div>
    `
  };
}