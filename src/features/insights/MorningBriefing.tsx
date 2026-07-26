"use client";
import { useEffect, useState } from "react";

type Facts = {
  revenueThisMonth: number;
  revenueChangeVsLastMonth: number | null;
  projectsBehindSchedule: number;
  invoicesNeedingAttention: number;
  followUpsDue: number;
  openPipelineLeads: number;
};

export function MorningBriefing() {
  const [facts, setFacts] = useState<Facts | null>(null);
  const [narrative, setNarrative] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/insights/briefing")
      .then((r) => r.json())
      .then((data) => {
        setFacts(data.facts);
        setNarrative(data.narrative);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (!facts) return null;

  return (
    <div className="card p-5 border-accent/30">
      <p className="text-[11px] text-accent uppercase tracking-wide mb-2">Morning briefing</p>
      {narrative ? (
        <p className="text-sm text-graphite-100 leading-relaxed whitespace-pre-wrap">{narrative}</p>
      ) : (
        // Falls back to the raw facts, plainly stated, if AI narration isn't
        // available (no credits, BYOAI not configured) - never blocks on it.
        <div className="text-sm text-graphite-200 space-y-1">
          <p>Revenue this month: ${facts.revenueThisMonth.toLocaleString()}{facts.revenueChangeVsLastMonth !== null && ` (${facts.revenueChangeVsLastMonth >= 0 ? "+" : ""}${facts.revenueChangeVsLastMonth}% vs last month)`}</p>
          {facts.projectsBehindSchedule > 0 && <p>{facts.projectsBehindSchedule} project{facts.projectsBehindSchedule === 1 ? "" : "s"} behind schedule.</p>}
          {facts.invoicesNeedingAttention > 0 && <p>{facts.invoicesNeedingAttention} invoice{facts.invoicesNeedingAttention === 1 ? "" : "s"} needing attention.</p>}
          {facts.followUpsDue > 0 && <p>{facts.followUpsDue} follow-up{facts.followUpsDue === 1 ? "" : "s"} due.</p>}
          <p>{facts.openPipelineLeads} open lead{facts.openPipelineLeads === 1 ? "" : "s"} in your pipeline.</p>
        </div>
      )}
    </div>
  );
}
