import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import { DollarSign, TrendingUp, Users, Briefcase, AlertCircle, FileText, FileSignature } from "lucide-react";
import { InsightCards } from "@/features/insights/InsightCards";
import { MorningBriefing } from "@/features/insights/MorningBriefing";
import { TodaysAgenda } from "@/features/dashboard/TodaysAgenda";
import { BusinessHealthIndicator } from "@/features/dashboard/BusinessHealthIndicator";
import { OnboardingChecklist } from "@/features/dashboard/OnboardingChecklist";
import { EmailNotConnectedBanner } from "@/features/dashboard/EmailNotConnectedBanner";

function money(n: number | { toString(): string }) {
  return `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function describeActivity(action: string, entityType: string, userName: string | undefined) {
  const who = userName || "Someone";
  const what = entityType.replace(/_/g, " ");
  const verb = action.replace(/_/g, " ");
  return `${who} ${verb} a ${what}`;
}

export default async function DashboardPage() {
  const ctx = await requireSession();
  if (!ctx) redirect("/login");
  const companyId = ctx.company.id;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const startOfYear = new Date(new Date().getFullYear(), 0, 1);

  const [monthPayments, ytdPayments, openLeads, activeJobs, unpaidInvoices, recentLeads, followUpsDue, recentActivity] = await Promise.all([
    db.payment.aggregate({ where: { companyId, paidAt: { gte: startOfMonth } }, _sum: { amount: true } }),
    db.payment.aggregate({ where: { companyId, paidAt: { gte: startOfYear } }, _sum: { amount: true } }),
    db.lead.count({ where: { companyId, pipelineStage: { in: ["NEW_LEAD", "CONTACTED", "ESTIMATE_SENT"] } } }),
    db.job.count({ where: { companyId, status: { in: ["SCHEDULED", "IN_PROGRESS"] } } }),
    db.invoice.findMany({ where: { companyId, status: { in: ["UNPAID", "OVERDUE"] } } }),
    db.lead.findMany({
      where: { companyId },
      include: { customer: true },
      orderBy: { createdAt: "desc" },
      take: 5
    }),
    db.lead.findMany({
      where: { companyId, nextFollowupAt: { lte: new Date() } },
      include: { customer: true },
      orderBy: { nextFollowupAt: "asc" },
      take: 5
    }),
    db.auditLog.findMany({
      where: { companyId },
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 6
    })
  ]);

  const outstandingTotal = unpaidInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);

  const [draftEstimates, pendingEstimates, approvedThisMonth, contractsAwaitingSignature] = await Promise.all([
    db.estimate.count({ where: { companyId, status: "DRAFT" } }),
    db.estimate.count({ where: { companyId, status: { in: ["SENT", "VIEWED"] } } }),
    db.estimate.count({ where: { companyId, status: "APPROVED", approvedAt: { gte: startOfMonth } } }),
    db.contract.count({ where: { companyId, status: "SENT" } })
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-white">Welcome back, {ctx.user.name.split(" ")[0]}</h1>
        <p className="text-sm text-graphite-400">Here's how {ctx.company.name} is doing.</p>
      </div>

      <EmailNotConnectedBanner />
      <OnboardingChecklist />
      <TodaysAgenda />
      <BusinessHealthIndicator />
      <MorningBriefing />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Revenue this month"
          value={money(monthPayments._sum.amount ?? 0)}
          icon={DollarSign}
          tone={Number(monthPayments._sum.amount ?? 0) > 0 ? "positive" : "neutral"}
        />
        <StatCard
          label="Revenue YTD"
          value={money(ytdPayments._sum.amount ?? 0)}
          icon={TrendingUp}
          tone={Number(ytdPayments._sum.amount ?? 0) > 0 ? "positive" : "neutral"}
        />
        <StatCard label="Open leads" value={String(openLeads)} sublabel="in your pipeline" icon={Users} tone="accent" />
        <StatCard label="Active jobs" value={String(activeJobs)} sublabel="scheduled or in progress" icon={Briefcase} tone="accent" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Draft estimates" value={String(draftEstimates)} icon={FileText} tone="neutral" />
        <StatCard label="Pending approval" value={String(pendingEstimates)} icon={FileText} tone={pendingEstimates > 0 ? "accent" : "neutral"} />
        <StatCard label="Approved this month" value={String(approvedThisMonth)} icon={FileText} tone={approvedThisMonth > 0 ? "positive" : "neutral"} />
        <StatCard label="Contracts awaiting signature" value={String(contractsAwaitingSignature)} icon={FileSignature} tone={contractsAwaitingSignature > 0 ? "warning" : "neutral"} />
      </div>

      <InsightCards />

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-white">Follow-ups due</h2>
            <Link href="/pipeline" className="text-xs text-accent hover:underline">View pipeline</Link>
          </div>
          <div className="space-y-3">
            {followUpsDue.length === 0 && <p className="text-sm text-graphite-400">Nothing due — you're caught up.</p>}
            {followUpsDue.map((lead) => (
              <Link key={lead.id} href={`/customers/${lead.customerId}`} className="flex items-center justify-between text-sm group">
                <span className="text-graphite-100 group-hover:text-accent">{lead.customer.name}</span>
                <Badge color="yellow">
                  {lead.nextFollowupAt && new Date(lead.nextFollowupAt).toISOString().slice(0, 10) < new Date().toISOString().slice(0, 10)
                    ? "Overdue"
                    : "Today"}
                </Badge>
              </Link>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-white">Recent leads</h2>
            <Link href="/pipeline" className="text-xs text-accent hover:underline">View pipeline</Link>
          </div>
          <div className="space-y-3">
            {recentLeads.length === 0 && <p className="text-sm text-graphite-400">No leads yet. Add your first customer to get started.</p>}
            {recentLeads.map((lead) => (
              <div key={lead.id} className="flex items-center justify-between text-sm">
                <span className="text-graphite-100">{lead.customer.name}</span>
                <Badge color={lead.pipelineStage === "WON" ? "green" : lead.pipelineStage === "LOST" ? "red" : "blue"}>
                  {lead.pipelineStage.replace("_", " ")}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: outstandingTotal > 0 ? "#F59E0B" : "#8A8F98" }} />
          <div className="flex items-center justify-between mb-3 pl-2">
            <h2 className="text-sm font-medium text-white flex items-center gap-2">
              <AlertCircle size={15} color={outstandingTotal > 0 ? "#F59E0B" : "#8A8F98"} />
              Outstanding invoices
            </h2>
            <Link href="/invoices" className="text-xs text-accent hover:underline">View all</Link>
          </div>
          <p className="text-2xl font-semibold mb-1 pl-2" style={{ color: outstandingTotal > 0 ? "#F59E0B" : "#fff" }}>
            {money(outstandingTotal)}
          </p>
          <p className="text-xs text-graphite-400 pl-2">{unpaidInvoices.length} invoice{unpaidInvoices.length === 1 ? "" : "s"} awaiting payment</p>
        </div>
      </div>
    </div>
  );
}
