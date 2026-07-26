import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { NotificationPreferencesForm } from "@/features/settings/NotificationPreferencesForm";

export default async function NotificationSettingsPage() {
  const ctx = await requireSession();
  if (!ctx) redirect("/login");

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-xl font-semibold text-white">Notifications</h1>
        <p className="text-sm text-graphite-400">
          These apply to you personally. In-app notifications are always on; choose what also reaches your email or phone.
        </p>
      </div>
      <NotificationPreferencesForm
        emailNotifications={ctx.user.emailNotifications}
        smsNotifications={ctx.user.smsNotifications}
        categoryPrefs={(ctx.user.notificationCategoryPrefs as Record<string, { email?: boolean; sms?: boolean }>) || {}}
        hasPhone={Boolean(ctx.user.phone)}
      />
    </div>
  );
}
