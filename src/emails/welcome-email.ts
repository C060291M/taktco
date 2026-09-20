// Sent once, at signup, via lib/platformEmail.ts (TAKTCO's own platform
// email, not a tenant's connected account - see that file's header for why
// this is a legitimate, separate case from the no-fallback rule for
// tenant-to-customer sends). The 3-step "fastest path" block was tested
// live via Resend - the section-by-section reference below it was added
// later and mirrors the real sidebar in src/components/layout/Sidebar.tsx,
// so it needs updating if that nav ever changes.
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
          <p style="margin:0 0 16px; font-size:14px;">Load a starter template for your trade, or build your own - this is what the AI Estimate Builder uses to price real jobs, never a guess.</p>

          <p style="margin:0 0 12px; color:#fff; font-weight:600;">2. Connect your email</p>
          <p style="margin:0 0 16px; font-size:14px;">Gmail, Outlook, or Resend - takes a couple of minutes in Settings &rarr; Notifications. Nothing sends to your customers until this is done.</p>

          <p style="margin:0 0 12px; color:#fff; font-weight:600;">3. Add your first customer, then build an estimate</p>
          <p style="margin:0; font-size:14px;">Try the AI Builder - describe the job in plain language and get a real, priced draft from your own Pricing Matrix.</p>
        </div>

        <a href="${appUrl}/dashboard" style="display:inline-block; background:#1EAEC4; color:#0E0F11; padding:10px 20px; border-radius:6px; text-decoration:none; font-weight:600;">Go to your dashboard</a>

        <div style="margin-top:32px; padding-top:24px; border-top:1px solid #2A2D33;">
          <p style="margin:0 0 4px; color:#fff; font-weight:600; font-size:15px;">Your dashboard, section by section</p>
          <p style="margin:0 0 16px; font-size:13px; color:#8A8F98;">A quick reference for what each part of TAKTCO is for and how it fits together - most days you'll only touch a few of these.</p>

          <table style="width:100%; border-collapse:collapse; font-size:13px;">
            <tr><td style="padding:8px 0; vertical-align:top; color:#fff; font-weight:600; white-space:nowrap; padding-right:14px;">Command Center</td><td style="padding:8px 0; vertical-align:top; color:#B4B8C0;">Your daily dashboard - revenue, active jobs, invoices needing attention, and follow-ups due, all at a glance.</td></tr>
            <tr><td style="padding:8px 0; vertical-align:top; color:#fff; font-weight:600; white-space:nowrap; padding-right:14px;">Customers</td><td style="padding:8px 0; vertical-align:top; color:#B4B8C0;">Every customer's contact info, tags, notes, and history in one record.</td></tr>
            <tr><td style="padding:8px 0; vertical-align:top; color:#fff; font-weight:600; white-space:nowrap; padding-right:14px;">Leads</td><td style="padding:8px 0; vertical-align:top; color:#B4B8C0;">Track a prospect from first contact through won or lost, with reminders so nothing goes cold.</td></tr>
            <tr><td style="padding:8px 0; vertical-align:top; color:#fff; font-weight:600; white-space:nowrap; padding-right:14px;">Estimates</td><td style="padding:8px 0; vertical-align:top; color:#B4B8C0;">Build a quote (or let the AI Builder draft one from your Pricing Matrix) and send it - the customer approves online, no account needed on their end.</td></tr>
            <tr><td style="padding:8px 0; vertical-align:top; color:#fff; font-weight:600; white-space:nowrap; padding-right:14px;">Contracts</td><td style="padding:8px 0; vertical-align:top; color:#B4B8C0;">Created automatically the moment an estimate is approved, or build one yourself - scope, payment terms, and e-signature.</td></tr>
            <tr><td style="padding:8px 0; vertical-align:top; color:#fff; font-weight:600; white-space:nowrap; padding-right:14px;">Projects</td><td style="padding:8px 0; vertical-align:top; color:#B4B8C0;">Run the job itself - crew assignments, daily logs, before/after photos, and punch lists.</td></tr>
            <tr><td style="padding:8px 0; vertical-align:top; color:#fff; font-weight:600; white-space:nowrap; padding-right:14px;">Invoices</td><td style="padding:8px 0; vertical-align:top; color:#B4B8C0;">Pulls straight from the approved estimate. Split into a deposit and final balance with one click; customers pay online.</td></tr>
            <tr><td style="padding:8px 0; vertical-align:top; color:#fff; font-weight:600; white-space:nowrap; padding-right:14px;">Schedule</td><td style="padding:8px 0; vertical-align:top; color:#B4B8C0;">A calendar view of every job and appointment across your team.</td></tr>
            <tr><td style="padding:8px 0; vertical-align:top; color:#fff; font-weight:600; white-space:nowrap; padding-right:14px;">Analytics</td><td style="padding:8px 0; vertical-align:top; color:#B4B8C0;">Revenue trends, win rate, and your Business Health Score - one real number built from your actual data.</td></tr>
            <tr><td style="padding:8px 0; vertical-align:top; color:#fff; font-weight:600; white-space:nowrap; padding-right:14px;">TAKTCO AI</td><td style="padding:8px 0; vertical-align:top; color:#B4B8C0;">Ask about your revenue, overdue invoices, or pipeline and get answers pulled from your real numbers.</td></tr>
            <tr><td style="padding:8px 0; vertical-align:top; color:#fff; font-weight:600; white-space:nowrap; padding-right:14px;">Automations</td><td style="padding:8px 0; vertical-align:top; color:#B4B8C0;">Build no-code rules like "Invoice paid, wait 7 days, ask for a review" - your business keeps working while you're on a job site.</td></tr>
            <tr><td style="padding:8px 0; vertical-align:top; color:#fff; font-weight:600; white-space:nowrap; padding-right:14px;">Marketing AI</td><td style="padding:8px 0; vertical-align:top; color:#B4B8C0;">Turn a finished job into a Facebook post, a photo flyer, or a review request in one click.</td></tr>
            <tr><td style="padding:8px 0; vertical-align:top; color:#fff; font-weight:600; white-space:nowrap; padding-right:14px;">Campaigns</td><td style="padding:8px 0; vertical-align:top; color:#B4B8C0;">Send a one-time email or SMS blast to a group of customers.</td></tr>
            <tr><td style="padding:8px 0; vertical-align:top; color:#fff; font-weight:600; white-space:nowrap; padding-right:14px;">Portfolio</td><td style="padding:8px 0; vertical-align:top; color:#B4B8C0;">A public gallery of your best finished work, built automatically from job photos.</td></tr>
            <tr><td style="padding:8px 0; vertical-align:top; color:#fff; font-weight:600; white-space:nowrap; padding-right:14px;">Settings</td><td style="padding:8px 0; vertical-align:top; color:#B4B8C0;">Your branding, Pricing Matrix, team, connected email/SMS, and billing all live here.</td></tr>
          </table>
        </div>

        <p style="color:#8A8F98; font-size:12px; margin-top:32px;">Your trial runs 7 days, no card needed. Questions? Just reply to this email.</p>
      </div>
    `
  };
}