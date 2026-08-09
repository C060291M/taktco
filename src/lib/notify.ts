import { db } from "@/database/client";
import { sendTrackedEmail } from "@/services/resend";
import { sendTrackedSms } from "@/services/twilio";
import { brandedEmail } from "@/emails/brandedEmail";

type Category =
  | "NEW_LEAD" | "ESTIMATE_VIEWED" | "ESTIMATE_APPROVED" | "CONTRACT_SIGNED" | "CONTRACT_DECLINED"
  | "INVOICE_SENT" | "INVOICE_PAID" | "INVOICE_OVERDUE" | "PROJECT_STATUS_CHANGED"
  | "CREW_ASSIGNMENT" | "FOLLOW_UP_DUE" | "REVIEW_RECEIVED" | "REFERRAL_RECEIVED"
  | "AI_RECOMMENDATION" | "SYSTEM_ANNOUNCEMENT";

function channelEnabled(user: { emailNotifications: boolean; smsNotifications: boolean; notificationCategoryPrefs: unknown }, category: Category, channel: "email" | "sms") {
  const prefs = (user.notificationCategoryPrefs as Record<string, { email?: boolean; sms?: boolean }>) || {};
  const override = prefs[category]?.[channel];
  if (override !== undefined) return override;
  return channel === "email" ? user.emailNotifications : user.smsNotifications;
}

// Creates the in-app Notification (always) and, per-recipient preference,
// also delivers email/SMS to Owners and Admins - the people who'd actually
// want to know about a new lead or an overdue invoice while away from the
// app. Field Techs and Sales Reps aren't included by default; this targets
// the roles most likely to own "the business", matching who Settings →
// Notifications is scoped to.
export async function notify(params: {
  companyId: string;
  category: Category;
  title: string;
  body?: string;
  linkUrl?: string;
}) {
  const notification = await db.notification.create({
    data: { companyId: params.companyId, category: params.category, title: params.title, body: params.body, linkUrl: params.linkUrl }
  });

  const [company, recipients] = await Promise.all([
    db.company.findUnique({ where: { id: params.companyId } }),
    db.user.findMany({ where: { companyId: params.companyId, role: { in: ["OWNER", "ADMIN"] } } })
  ]);
  if (!company) return notification;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  for (const user of recipients) {
    if (channelEnabled(user, params.category, "email")) {
      const html = brandedEmail({
        companyName: company.name,
        logoUrl: company.logoUrl,
        accentColor: company.brandAccentColor,
        heading: params.title,
        bodyHtml: params.body || "",
        ctaLabel: params.linkUrl ? "View in TAKTCO" : undefined,
        ctaUrl: params.linkUrl ? `${appUrl}${params.linkUrl}` : undefined
      });
      await sendTrackedEmail({ companyId: params.companyId, toEmail: user.email, subject: params.title, html, kind: "notification" });
    }
    if (user.phone && channelEnabled(user, params.category, "sms")) {
      await sendTrackedSms({ companyId: params.companyId, toPhone: user.phone, body: `${params.title}${params.body ? " — " + params.body : ""}`, kind: "notification" });
    }
  }

  return notification;
}

