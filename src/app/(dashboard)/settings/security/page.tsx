import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/features/settings/ChangePasswordForm";

export default async function SecuritySettingsPage() {
  const ctx = await requireSession();
  if (!ctx) redirect("/login");

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-xl font-semibold text-white">Security</h1>
        <p className="text-sm text-graphite-400">Manage your account password.</p>
      </div>
      <ChangePasswordForm />
      <div className="card p-5">
        <h2 className="text-sm font-medium text-white mb-1">Coming later</h2>
        <p className="text-xs text-graphite-500">
          Two-factor authentication, active session management, and API keys aren't built yet — they need session-tracking
          infrastructure this build doesn't have. Password change works today and is the meaningful security control for now.
        </p>
      </div>
    </div>
  );
}
