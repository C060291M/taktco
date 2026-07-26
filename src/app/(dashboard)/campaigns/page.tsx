import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { NewCampaignForm } from "@/features/campaigns/NewCampaignForm";
import { SendCampaignButton } from "@/features/campaigns/SendCampaignButton";

export default async function CampaignsPage() {
  const ctx = await requireSession();
  if (!ctx) redirect("/login");

  const campaigns = await db.campaign.findMany({
    where: { companyId: ctx.company.id },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Campaigns</h1>
          <p className="text-sm text-graphite-400">Email and SMS sends to your customer list.</p>
        </div>
        <NewCampaignForm />
      </div>

      <div className="card p-4 border-amber-500/30 bg-amber-500/5">
        <p className="text-xs text-amber-300">
          Sends through Resend (email) and Twilio (SMS) when your company has those configured — otherwise every send
          is logged as failed rather than silently pretending to deliver. Check Delivered/Failed below after sending.
          See the README for setup and current limitations (no retry queue or bounce/open tracking yet).
        </p>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-graphite-400 border-b border-graphite-700">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Channel</th>
              <th className="px-4 py-3 font-medium">Audience</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Delivered</th>
              <th className="px-4 py-3 font-medium">Failed</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {campaigns.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-graphite-400">No campaigns yet.</td></tr>
            )}
            {campaigns.map((c) => (
              <tr key={c.id} className="border-b border-graphite-700 last:border-0">
                <td className="px-4 py-3 text-graphite-100">{c.name}</td>
                <td className="px-4 py-3 text-graphite-300">{c.channel}</td>
                <td className="px-4 py-3 text-graphite-400 text-xs">{c.audience.replace(/_/g, " ")}</td>
                <td className="px-4 py-3">
                  <Badge color={c.status === "SENT" ? "green" : "gray"}>{c.status}</Badge>
                </td>
                <td className="px-4 py-3 text-emerald-400">{c.status === "SENT" ? c.deliveredCount : "—"}</td>
                <td className="px-4 py-3 text-red-400">{c.status === "SENT" ? c.failedCount : "—"}</td>
                <td className="px-4 py-3 text-right">
                  {c.status === "DRAFT" && <SendCampaignButton campaignId={c.id} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
