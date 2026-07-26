import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MarketingProfileForm } from "@/features/settings/MarketingProfileForm";

export default async function MarketingSettingsPage() {
  const ctx = await requireSession();
  if (!ctx) redirect("/login");

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-xl font-semibold text-white">Marketing profile</h1>
        <p className="text-sm text-graphite-400">Shapes how Marketing AI writes for your business.</p>
      </div>
      <MarketingProfileForm
        initial={{
          brandVoice: ctx.company.brandVoice,
          targetAudience: ctx.company.targetAudience,
          googleReviewLink: ctx.company.googleReviewLink
        }}
      />
    </div>
  );
}
