import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { VerificationPanel } from "@/features/settings/VerificationPanel";

export default async function PaymentsSettingsPage() {
  const ctx = await requireSession();
  if (!ctx) redirect("/login");

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <Link href="/settings" className="text-xs text-graphite-400 hover:text-white">← Settings</Link>
        <h1 className="text-xl font-semibold text-white mt-2">Payment collection</h1>
        <p className="text-sm text-graphite-400">
          Verify your business once to start accepting customer payments through TAKTCO.
        </p>
      </div>

      <VerificationPanel
        initial={{
          verificationStatus: ctx.company.verificationStatus,
          payoutsEnabled: ctx.company.payoutsEnabled,
          legalBusinessName: ctx.company.legalBusinessName
        }}
        isOwner={ctx.user.role === "OWNER"}
      />
    </div>
  );
}
