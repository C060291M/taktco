import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/database/client";
import { BrandingForm } from "@/features/settings/BrandingForm";
import { ProfileForm } from "@/features/settings/ProfileForm";

export default async function SettingsPage() {
  const ctx = await requireSession();
  if (!ctx) redirect("/login");

  const teamCount = await db.user.count({ where: { companyId: ctx.company.id } });

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-xl font-semibold text-white">Settings</h1>
        <p className="text-sm text-graphite-400">Make TAKTCO look like your company.</p>
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-medium text-white mb-1">Company</h2>
        <p className="text-xs text-graphite-400 mb-4">
          {ctx.company.name} · plan: {ctx.company.subscriptionTier} · yourcompany.novaos.app/{ctx.company.subdomain}
        </p>
        <BrandingForm
          company={{
            name: ctx.company.name,
            logoUrl: ctx.company.logoUrl,
            brandAccentColor: ctx.company.brandAccentColor,
            dashboardTheme: ctx.company.dashboardTheme,
            timeZone: ctx.company.timeZone
          }}
        />
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-white">Payment collection</h2>
            <p className="text-xs text-graphite-400 mt-1">
              {ctx.company.verificationStatus === "VERIFIED"
                ? "Verified — you can accept customer payments."
                : ctx.company.verificationStatus === "PENDING"
                ? "Verification submitted, waiting on approval."
                : "Not set up yet — required before you can collect payments."}
            </p>
          </div>
          <a href="/settings/payments" className="btn-secondary">Manage</a>
        </div>
      </div>

      {(ctx.user.role === "OWNER" || ctx.user.role === "ADMIN") && (
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium text-white">Team</h2>
              <p className="text-xs text-graphite-400 mt-1">
                {teamCount} {teamCount === 1 ? "person has" : "people have"} access to this workspace.
              </p>
            </div>
            <a href="/settings/team" className="btn-secondary">Manage</a>
          </div>
        </div>
      )}

      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-white">CRM settings</h2>
            <p className="text-xs text-graphite-400 mt-1">Manage customer tags and lead sources.</p>
          </div>
          <a href="/settings/crm" className="btn-secondary">Manage</a>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-white">TAKTCO AI</h2>
            <p className="text-xs text-graphite-400 mt-1">Credits, usage, and provider settings.</p>
          </div>
          <a href="/settings/ai" className="btn-secondary">Manage</a>
        </div>
      </div>

      {ctx.user.role === "OWNER" && (
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium text-white">Billing</h2>
              <p className="text-xs text-graphite-400 mt-1">Your TAKTCO subscription plan.</p>
            </div>
            <a href="/settings/billing" className="btn-secondary">Manage</a>
          </div>
        </div>
      )}

      <div className="card p-5">
        <h2 className="text-sm font-medium text-white mb-1">Your profile</h2>
        <p className="text-xs text-graphite-400 mb-4">{ctx.user.email} · {ctx.user.role.replace("_", " ")}</p>
        <ProfileForm
          profile={{
            name: ctx.user.name,
            phone: ctx.user.phone,
            emailNotifications: ctx.user.emailNotifications,
            smsNotifications: ctx.user.smsNotifications
          }}
        />
      </div>
    </div>
  );
}



