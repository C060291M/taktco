import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BrandingForm } from "./BrandingForm";

export default async function SettingsPage() {
  const ctx = await requireSession();
  if (!ctx) redirect("/login");

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-xl font-semibold text-white">Settings</h1>
        <p className="text-sm text-graphite-400">Make NovaOS look like your company.</p>
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
            brandAccentColor: ctx.company.brandAccentColor
          }}
        />
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-medium text-white mb-1">Your role</h2>
        <p className="text-sm text-graphite-300">{ctx.user.name} — {ctx.user.role.replace("_", " ")}</p>
      </div>
    </div>
  );
}
