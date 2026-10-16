import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BillingPanel } from "@/features/settings/BillingPanel";
import { accessInfo } from "@/lib/accountAccess";
import { billingFreeNote } from "@/lib/billingAccess";

export default async function BillingSettingsPage() {
  const ctx = await requireSession();
  if (!ctx) redirect("/login");

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <Link href="/settings" className="text-xs text-graphite-400 hover:text-white">← Settings</Link>
        <h1 className="text-xl font-semibold text-white mt-2">Billing</h1>
        <p className="text-sm text-graphite-400">Your TAKTCO subscription.</p>
      </div>

      <BillingPanel
        currentTier={ctx.company.subscriptionTier}
        status={ctx.company.subscriptionStatus}
        freeNote={billingFreeNote(accessInfo(ctx.company))}
        currentPeriodEnd={ctx.company.currentPeriodEnd ? ctx.company.currentPeriodEnd.toISOString() : null}
        hasStripeCustomer={Boolean(ctx.company.stripeCustomerId)}
        isOwner={ctx.user.role === "OWNER"}
      />
    </div>
  );
}
