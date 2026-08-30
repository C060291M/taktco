"use client";
import { useState, useEffect } from "react";
import { StatCard } from "@/components/ui/StatCard";
import { DollarSign, Briefcase, FileText, Receipt, TrendingUp, Target } from "lucide-react";

type Facts = {
  revenue: number;
  revenuePriorPeriod: number;
  jobsCompleted: number;
  estimatesApproved: number;
  avgJobValue: number;
  invoicesPaidCount: number;
  leadsWon: number;
  leadsLost: number;
  closingRate: number | null;
};

function money(n: number) {
  return "$" + n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function PeriodReview() {
  const now = new Date();
  const [type, setType] = useState<"month" | "year">("month");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [facts, setFacts] = useState<Facts | null>(null);
  const [narrative, setNarrative] = useState("");
  const [periodLabel, setPeriodLabel] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(function () {
    setLoading(true);
    const params = new URLSearchParams({ type, year: String(year), month: String(month) });
    fetch("/api/insights/period-summary?" + params.toString())
      .then(function (r) { return r.json(); })
      .then(function (data) {
        setFacts(data.facts);
        setNarrative(data.narrative);
        setPeriodLabel(data.periodLabel);
        setLoading(false);
      })
      .catch(function () { setLoading(false); });
  }, [type, year, month]);

  const revenueChange = facts && facts.revenuePriorPeriod > 0
    ? Math.round(((facts.revenue - facts.revenuePriorPeriod) / facts.revenuePriorPeriod) * 100)
    : null;

  const yearOptions: number[] = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 4; y--) yearOptions.push(y);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-sm font-medium text-white">Business Review</h2>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-graphite-700 overflow-hidden">
            <button
              type="button"
              className={"text-xs px-3 py-1.5 whitespace-nowrap shrink-0 " + (type === "month" ? "bg-accent text-accent-foreground" : "text-graphite-300 hover:bg-graphite-800")}
              onClick={function () { setType("month"); }}
            >
              Monthly
            </button>
            <button
              type="button"
              className={"text-xs px-3 py-1.5 whitespace-nowrap shrink-0 " + (type === "year" ? "bg-accent text-accent-foreground" : "text-graphite-300 hover:bg-graphite-800")}
              onClick={function () { setType("year"); }}
            >
              Yearly
            </button>
          </div>
          {type === "month" && (
            <select className="input w-32 text-xs py-1.5" value={month} onChange={function (e) { setMonth(Number(e.target.value)); }}>
              {MONTH_NAMES.map(function (name, i) {
                return <option key={i} value={i}>{name}</option>;
              })}
            </select>
          )}
          <select className="input w-24 text-xs py-1.5" value={year} onChange={function (e) { setYear(Number(e.target.value)); }}>
            {yearOptions.map(function (y) {
              return <option key={y} value={y}>{y}</option>;
            })}
          </select>
        </div>
      </div>

      {loading || !facts ? (
        <p className="text-sm text-graphite-400">Loading...</p>
      ) : (
        <>
          {narrative && (
            <p className="text-sm text-graphite-100 leading-relaxed mb-5 pb-5 border-b border-graphite-700 whitespace-pre-wrap">{narrative}</p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard
              label="Revenue"
              value={money(facts.revenue)}
              sublabel={revenueChange !== null ? (revenueChange >= 0 ? "+" : "") + revenueChange + "% vs prior period" : undefined}
              icon={DollarSign}
              tone={facts.revenue > 0 ? "positive" : "neutral"}
            />
            <StatCard label="Jobs completed" value={String(facts.jobsCompleted)} icon={Briefcase} tone={facts.jobsCompleted > 0 ? "positive" : "neutral"} />
            <StatCard label="Estimates approved" value={String(facts.estimatesApproved)} icon={FileText} tone={facts.estimatesApproved > 0 ? "accent" : "neutral"} />
            <StatCard label="Avg. job value" value={money(facts.avgJobValue)} icon={TrendingUp} tone="accent" />
            <StatCard label="Invoices paid" value={String(facts.invoicesPaidCount)} icon={Receipt} tone={facts.invoicesPaidCount > 0 ? "positive" : "neutral"} />
            <StatCard label="Leads won" value={String(facts.leadsWon)} icon={Target} tone={facts.leadsWon > 0 ? "positive" : "neutral"} />
            <StatCard label="Closing rate" value={facts.closingRate === null ? "-" : facts.closingRate + "%"} sublabel={facts.leadsWon + facts.leadsLost > 0 ? (facts.leadsWon + facts.leadsLost) + " leads closed" : undefined} icon={Target} tone={facts.closingRate === null ? "neutral" : facts.closingRate >= 50 ? "positive" : "warning"} />
          </div>
        </>
      )}
    </div>
  );
}



