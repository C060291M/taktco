import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";

function money(n: number | { toString(): string }) {
  return `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default async function DashboardPage() {
  const ctx = await requireSession();
  if (!ctx) redirect("/login");
  const companyId = ctx.company.id;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const startOfYear = new Date(new Date().getFullYear(), 0, 1);

  const [monthPayments, ytdPayments, openLeads, activeJobs, unpaidInvoices, recentLeads] = await Promise.all([
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
    })
  ]);

  const outstandingTotal = unpaidInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-white">Welcome back, {ctx.user.name.split(" ")[0]}</h1>
        <p className="text-sm text-graphite-400">Here's how {ctx.company.name} is doing.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Revenue this month" value={money(monthPayments._sum.amount ?? 0)} />
        <StatCard label="Revenue YTD" value={money(ytdPayments._sum.amount ?? 0)} />
        <StatCard label="Open leads" value={String(openLeads)} sublabel="in your pipeline" />
        <StatCard label="Active jobs" value={String(activeJobs)} sublabel="scheduled or in progress" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
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

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-white">Outstanding invoices</h2>
            <Link href="/invoices" className="text-xs text-accent hover:underline">View all</Link>
          </div>
          <p className="text-2xl font-semibold text-white mb-1">{money(outstandingTotal)}</p>
          <p className="text-xs text-graphite-400">{unpaidInvoices.length} invoice{unpaidInvoices.length === 1 ? "" : "s"} awaiting payment</p>
        </div>
      </div>
    </div>
  );
}
