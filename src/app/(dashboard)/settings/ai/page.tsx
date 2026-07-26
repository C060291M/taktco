import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/database/client";
import { AiSettingsPanel } from "@/features/settings/AiSettingsPanel";

export default async function AiSettingsPage() {
  const ctx = await requireSession();
  if (!ctx) redirect("/login");

  const [settings, wallet, recentUsage] = await Promise.all([
    db.companyAiSettings.findUnique({ where: { companyId: ctx.company.id } }),
    db.aiCreditWallet.findUnique({ where: { companyId: ctx.company.id } }),
    db.aiUsageLog.findMany({ where: { companyId: ctx.company.id }, orderBy: { createdAt: "desc" }, take: 10 })
  ]);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link href="/settings" className="text-xs text-graphite-400 hover:text-white">← Settings</Link>
        <h1 className="text-xl font-semibold text-white mt-2">TAKTCO AI</h1>
        <p className="text-sm text-graphite-400">Choose how TAKTCO powers AI features for your company.</p>
      </div>

      <AiSettingsPanel
        initial={{
          mode: settings?.mode || "NOVA_AI",
          byoaiProvider: settings?.byoaiProvider || null,
          connectionStatus: settings?.connectionStatus || "untested",
          hasKeyStored: Boolean(settings?.encryptedApiKey)
        }}
        wallet={
          wallet
            ? {
                includedCredits: wallet.includedCredits,
                purchasedCredits: wallet.purchasedCredits,
                usedThisCycle: wallet.usedThisCycle,
                cycleResetAt: wallet.cycleResetAt.toISOString()
              }
            : null
        }
        isOwnerOrAdmin={ctx.user.role === "OWNER" || ctx.user.role === "ADMIN"}
      />

      <div className="card p-5">
        <h2 className="text-sm font-medium text-white mb-3">Recent usage</h2>
        {recentUsage.length === 0 ? (
          <p className="text-sm text-graphite-400">No AI requests logged yet.</p>
        ) : (
          <div className="space-y-2">
            {recentUsage.map((u) => (
              <div key={u.id} className="flex items-center justify-between text-sm">
                <span className="text-graphite-300">{u.feature.replace(/_/g, " ")} · {u.mode === "NOVA_AI" ? "TAKTCO AI" : u.provider}</span>
                <span className={u.status === "success" ? "text-graphite-400" : "text-red-400"}>
                  {u.mode === "NOVA_AI" ? `${u.creditsUsed} credits` : "no charge"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
