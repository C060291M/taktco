import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { StatCard } from "@/components/ui/StatCard";
import { BarChart } from "@/components/ui/BarChart";
import { Target, TrendingUp, Repeat, CheckCircle2 } from "lucide-react";

function money(n: number | { toString(): string }) {
  return `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function monthLabel(offsetFromNow: number) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - offsetFromNow);
  return { date: d, label: d.toLocaleDateString(undefined, { month: "short" }) };
}

export default async function AnalyticsPage() {
  const ctx = await requireSession();
  if (!ctx) redirect("/login");
  const companyId = ctx.company.id;

  const [wonCount, lostCount, jobs, customersWithJobCounts, revenueByMonth] = await Promise.all([
    db.lead.count({ where: { companyId, pipelineStage: "WON" } }),
    db.lead.count({ where: { companyId, pipelineStage: "LOST" } }),
    db.job.findMany({
      where: { companyId },
      include: { customer: true },
      orderBy: { createdAt: "desc" }
    }),
    db.customer.findMany({
      where: { companyId, deletedAt: null },
      include: { _count: { select: { jobs: true } } }
    }),
    Promise.all(
      Array.from({ length: 6 }).map(async (_, i) => {
        const offset = 5 - i; // oldest to newest, left to right
        const { date, label } = monthLabel(offset);
        const start = new Date(date.getFullYear(), date.getMonth(), 1);
        const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
        const result = await db.payment.aggregate({
          where: { companyId, paidAt: { gte: start, lt: end } },
          _sum: { amount: true }
        });
        return { label, value: Number(result._sum.amount ?? 0) };
      })
    )
  ]);

  const closedLeads = wonCount + lostCount;
  const closingRate = closedLeads > 0 ? Math.round((wonCount / closedLeads) * 100) : null;

  const completedJobs = jobs.filter((j) => j.status === "COMPLETE");
  const avgJobValue = jobs.length > 0 ? jobs.reduce((sum, j) => sum + Number(j.quotedCost), 0) / jobs.length : 0;

  const customersWithJobs = customersWithJobCounts.filter((c) => c._count.jobs > 0);
  const repeatCustomers = customersWithJobCounts.filter((c) => c._count.jobs > 1);
  const repeatRate = customersWithJobs.length > 0 ? Math.round((repeatCustomers.length / customersWithJobs.length) * 100) : null;

  const profitableJobs = jobs
    .map((j) => ({
      id: j.id,
      customerName: j.customer.name,
      quoted: Number(j.quotedCost),
      actual: Number(j.actualCost),
      profit: Number(j.quotedCost) - Number(j.actualCost)
    }))
    .sort((a, b) => b.profit - a.profit);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-white">Analytics</h1>
        <p className="text-sm text-graphite-400">How {ctx.company.name} is performing over time.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Closing rate"
          value={closingRate === null ? "—" : `${closingRate}%`}
          sublabel={closedLeads > 0 ? `${wonCount} won of ${closedLeads} closed` : "No closed leads yet"}
          icon={Target}
          tone={closingRate === null ? "neutral" : closingRate >= 50 ? "positive" : "warning"}
        />
        <StatCard
          label="Average job value"
          value={money(avgJobValue)}
          sublabel={`${jobs.length} job${jobs.length === 1 ? "" : "s"} total`}
          icon={TrendingUp}
          tone={jobs.length > 0 ? "accent" : "neutral"}
        />
        <StatCard
          label="Repeat customer rate"
          value={repeatRate === null ? "—" : `${repeatRate}%`}
          sublabel={customersWithJobs.length > 0 ? `${repeatCustomers.length} of ${customersWithJobs.length} customers` : "No completed jobs yet"}
          icon={Repeat}
          tone={repeatRate === null ? "neutral" : "accent"}
        />
        <StatCard
          label="Jobs completed"
          value={String(completedJobs.length)}
          sublabel={`of ${jobs.length} total`}
          icon={CheckCircle2}
          tone={completedJobs.length > 0 ? "positive" : "neutral"}
        />
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-medium text-white mb-4">Revenue, last 6 months</h2>
        <BarChart data={revenueByMonth} />
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-medium text-white mb-3">Profit by project</h2>
        {profitableJobs.length === 0 ? (
          <p className="text-sm text-graphite-400">No jobs yet — profit shows up here once quoted and actual costs are tracked on a job.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-graphite-400 border-b border-graphite-700">
                <th className="py-2 font-medium">Customer</th>
                <th className="py-2 font-medium text-right">Quoted</th>
                <th className="py-2 font-medium text-right">Actual cost</th>
                <th className="py-2 font-medium text-right">Profit</th>
              </tr>
            </thead>
            <tbody>
              {profitableJobs.map((j) => (
                <tr key={j.id} className="border-b border-graphite-700 last:border-0">
                  <td className="py-2 text-graphite-100">{j.customerName}</td>
                  <td className="py-2 text-graphite-300 text-right">{money(j.quoted)}</td>
                  <td className="py-2 text-graphite-300 text-right">{money(j.actual)}</td>
                  <td className="py-2 text-right font-medium" style={{ color: j.profit >= 0 ? "#22C55E" : "#EF4444" }}>
                    {money(j.profit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
