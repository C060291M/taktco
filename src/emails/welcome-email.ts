// Placeholder email template - not wired to actually send (see services/resend.ts).
// Kept as plain data (subject + html string) rather than a React Email component
// so it has zero new dependencies until Resend is actually implemented.
export function welcomeEmail({ companyName, ownerName }: { companyName: string; ownerName: string }) {
  return {
    subject: `Welcome to TAKTCO, ${ownerName}`,
    html: `
      <div style="font-family: sans-serif; background:#0E0F11; color:#DDE0E4; padding:32px;">
        <h1 style="color:#fff;">Welcome to TAKTCO</h1>
        <p>Hi ${ownerName}, your workspace for <strong>${companyName}</strong> is ready.</p>
        <p style="color:#8A8F98; font-size:12px;">Beyond The Tape.</p>
      </div>
    `
  };
}
