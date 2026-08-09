import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { EstimateDefaultsForm } from "@/features/settings/EstimateDefaultsForm";

export default async function EstimateSettingsPage() {
  const ctx = await requireSession();
  if (!ctx) redirect("/login");

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-xl font-semibold text-white">Estimate defaults</h1>
        <p className="text-sm text-graphite-400">Pre-fill new estimates instead of starting from a blank form every time.</p>
      </div>
      <EstimateDefaultsForm
        initial={{
          defaultMarkupPercent: ctx.company.defaultMarkupPercent ? Number(ctx.company.defaultMarkupPercent) : null,
          defaultLaborRate: ctx.company.defaultLaborRate ? Number(ctx.company.defaultLaborRate) : null,
          defaultWarrantyText: ctx.company.defaultWarrantyText,
          defaultEstimateTerms: ctx.company.defaultEstimateTerms,
          estimateExpirationEnabled: ctx.company.estimateExpirationEnabled,
          defaultEstimateValidDays: ctx.company.defaultEstimateValidDays
        }}
      />
    </div>
  );
}

