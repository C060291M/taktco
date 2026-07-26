import { db } from "@/database/client";
import { stripeConfigured } from "@/services/stripe";
import { resendConfigured } from "@/services/resend";
import { twilioConfigured } from "@/services/twilio";
import { storageConfigured } from "@/lib/storage";
import { Badge } from "@/components/ui/Badge";

function StatusRow({ name, configured, note }: { name: string; configured: boolean; note: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-graphite-700 last:border-0">
      <div>
        <p className="text-sm text-graphite-100">{name}</p>
        <p className="text-xs text-graphite-500">{note}</p>
      </div>
      <Badge color={configured ? "green" : "gray"}>{configured ? "Configured" : "Not configured"}</Badge>
    </div>
  );
}

export default async function AdminHealthPage() {
  const [pendingJobs, failedJobs, recentErrors, dbOk] = await Promise.all([
    db.jobQueueItem.count({ where: { status: "QUEUED" } }),
    db.jobQueueItem.count({ where: { status: "FAILED" } }),
    db.errorLog.count({ where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
    db.company.count().then(() => true).catch(() => false)
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Platform Health</h1>
        <p className="text-sm text-graphite-400">
          Configuration status only — this checks whether credentials are present, not whether the provider is
          actually reachable. None of these integrations have been called from this build environment (no internet
          access here); "Configured" means ready to test, not verified working.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-xs text-graphite-400">Database</p>
          <p className="text-lg font-semibold mt-1" style={{ color: dbOk ? "#22C55E" : "#EF4444" }}>{dbOk ? "Connected" : "Unreachable"}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-graphite-400">Job queue — pending</p>
          <p className="text-lg font-semibold text-white mt-1">{pendingJobs}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-graphite-400">Errors, last 24h</p>
          <p className="text-lg font-semibold mt-1" style={{ color: recentErrors > 0 ? "#F59E0B" : "#22C55E" }}>{recentErrors}</p>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-medium text-white mb-2">Integrations</h2>
        <StatusRow name="Stripe" configured={stripeConfigured} note="Payments, subscriptions, credit purchases" />
        <StatusRow name="Object storage (R2/S3)" configured={storageConfigured} note="Logos, job photos, contract documents" />
        <StatusRow name="Resend" configured={resendConfigured} note="Transactional email + campaigns" />
        <StatusRow name="Twilio" configured={twilioConfigured} note="SMS + campaigns" />
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-medium text-white mb-2">Background jobs</h2>
        <div className="flex items-center justify-between text-sm">
          <span className="text-graphite-300">Failed jobs (after max retries)</span>
          <span className={failedJobs > 0 ? "text-red-400" : "text-graphite-400"}>{failedJobs}</span>
        </div>
      </div>
    </div>
  );
}
