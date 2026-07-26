import { db } from "@/database/client";
import { StatCard } from "@/components/ui/StatCard";
import { Building2, Users, UserPlus, DollarSign, TrendingUp } from "lucide-react";
import { ADMIN_INTERNAL_SUBDOMAIN, TIER_PRICES } from "@/lib/admin";
import { ExpensesEditor } from "@/features/admin/ExpensesEditor";

export default async function AdminDashboardPage() {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // The internal TAKTCO HQ company (the platform admin's own account) is
  // excluded from every stat below - it's not a customer.
  const customerCompanyFilter = { subdomain: { not: ADMIN_INTERNAL_SUBDOMAIN } };

  const [totalCompanies, totalUsers, newCompaniesThisMonth, companies, activeByTier, trialCount, finance] = await Promise.all([
    db.company.count({ where: customerCompanyFilter }),
    db.user.count({ where: { company: customerCompanyFilter } }),
    db.company.count({ where: { ...customerCompanyFilter, createdAt: { gte: startOfMonth } } }),
    db.company.findMany({
      where: customerCompanyFilter,
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { _count: { select: { users: true, jobs: true, customers: true } } }
    }),
    db.company.groupBy({
      by: ["subscriptionTier"],
      where: { ...customerCompanyFilter, subscriptionStatus: "active" },
      _count: true
    }),
    db.company.count({ where: { ...customerCompanyFilter, subscriptionStatus: "trialing" } }),
    db.platformFinance.findFirst()
  ]);

  const mrr = activeByTier.reduce((sum, group) => sum + (TIER_PRICES[group.subscriptionTier] || 0) * group._count, 0);
  const arr = mrr * 12;
  const activeSubscriptions = activeByTier.reduce((sum, g) => sum + g._count, 0);
  const monthlyExpenses = (finance?.monthlyExpensesCents ?? 0) / 100;
  const margin = mrr - monthlyExpenses;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-white">Platform overview</h1>
        <p className="text-sm text-graphite-400">Every company running on TAKTCO — excludes your own internal account.</p>
      </div>

      <div className="card p-4 border-amber-500/30 bg-amber-500/5">
        <p className="text-xs text-amber-300">
          MRR/ARR below is computed from active subscriptions × their tier price — real, but only as accurate as Stripe's
          webhook data, which has never processed a real subscription in this build environment (no internet access here).
          Verify against Stripe's own dashboard once live. Monthly expenses are manually entered, not derived from anything.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="MRR" value={`$${mrr.toLocaleString()}`} icon={DollarSign} tone={mrr > 0 ? "positive" : "neutral"} />
        <StatCard label="ARR" value={`$${arr.toLocaleString()}`} icon={TrendingUp} tone={arr > 0 ? "positive" : "neutral"} />
        <StatCard label="Active subscriptions" value={String(activeSubscriptions)} icon={Building2} tone="accent" />
        <StatCard label="Trial accounts" value={String(trialCount)} icon={UserPlus} tone={trialCount > 0 ? "accent" : "neutral"} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total companies" value={String(totalCompanies)} icon={Building2} tone="neutral" />
        <StatCard label="Total users" value={String(totalUsers)} icon={Users} tone="neutral" />
        <StatCard label="New companies this month" value={String(newCompaniesThisMonth)} icon={UserPlus} tone="neutral" />
        <StatCard label="Avg users per company" value={totalCompanies > 0 ? (totalUsers / totalCompanies).toFixed(1) : "0"} icon={Users} tone="neutral" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="text-sm font-medium text-white mb-3">Active subscriptions by tier</h2>
          {activeByTier.length === 0 ? (
            <p className="text-sm text-graphite-400">No active subscriptions yet.</p>
          ) : (
            <div className="space-y-2">
              {activeByTier.map((g) => (
                <div key={g.subscriptionTier} className="flex items-center justify-between text-sm">
                  <span className="text-graphite-200 capitalize">{g.subscriptionTier}</span>
                  <span className="text-graphite-400">{g._count} × ${TIER_PRICES[g.subscriptionTier] || 0}/mo</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-medium text-white mb-3">Monthly margin (estimate)</h2>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-graphite-300">Revenue (MRR)</span>
            <span className="text-emerald-400">${mrr.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-graphite-300">Expenses</span>
            <span className="text-red-400">${monthlyExpenses.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-sm font-medium pt-2 border-t border-graphite-700">
            <span className="text-white">Margin</span>
            <span className={margin >= 0 ? "text-emerald-400" : "text-red-400"}>${margin.toLocaleString()}</span>
          </div>
          <div className="mt-3 pt-3 border-t border-graphite-700">
            <ExpensesEditor initialCents={finance?.monthlyExpensesCents ?? 0} />
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-graphite-700">
          <h2 className="text-sm font-medium text-white">Recent companies</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-graphite-400 border-b border-graphite-700">
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium">Trade</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Users</th>
              <th className="px-4 py-3 font-medium">Customers</th>
              <th className="px-4 py-3 font-medium">Jobs</th>
              <th className="px-4 py-3 font-medium">Signed up</th>
            </tr>
          </thead>
          <tbody>
            {companies.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-graphite-400">No customer companies yet.</td></tr>
            )}
            {companies.map((c) => (
              <tr key={c.id} className="border-b border-graphite-700 last:border-0">
                <td className="px-4 py-3 text-graphite-100">{c.name}</td>
                <td className="px-4 py-3 text-graphite-300">{c.tradeType || "—"}</td>
                <td className="px-4 py-3 text-graphite-300 capitalize">{c.subscriptionTier}</td>
                <td className="px-4 py-3 text-graphite-300">{c.subscriptionStatus || "—"}</td>
                <td className="px-4 py-3 text-graphite-300">{c._count.users}</td>
                <td className="px-4 py-3 text-graphite-300">{c._count.customers}</td>
                <td className="px-4 py-3 text-graphite-300">{c._count.jobs}</td>
                <td className="px-4 py-3 text-graphite-300">{new Date(c.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
