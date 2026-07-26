"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";

type Insight = {
  id: string;
  category: string;
  severity: string;
  title: string;
  body: string | null;
  ruleExplanation: string;
  linkUrl: string | null;
  recommendedAction: string | null;
};

function severityColor(s: string) {
  if (s === "HIGH") return "red";
  if (s === "MEDIUM") return "yellow";
  return "gray";
}

export function InsightCards() {
  const router = useRouter();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/insights")
      .then((r) => r.json())
      .then((data) => {
        setInsights(data);
        setLoading(false);
      });
  }, []);

  async function dismiss(id: string) {
    setInsights((prev) => prev.filter((i) => i.id !== id));
    await fetch(`/api/insights/${id}`, { method: "PATCH" });
  }

  if (loading || insights.length === 0) return null;

  return (
    <div className="card p-5">
      <h2 className="text-sm font-medium text-white mb-3">Insights & recommendations</h2>
      <div className="space-y-2">
        {insights.map((insight) => (
          <div key={insight.id} className="border border-graphite-700 rounded-lg p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge color={severityColor(insight.severity)}>{insight.severity}</Badge>
                  <p className="text-sm text-white font-medium truncate">{insight.title}</p>
                </div>
                {insight.body && <p className="text-xs text-graphite-400 mt-1">{insight.body}</p>}
                {insight.recommendedAction && (
                  <p className="text-xs text-accent mt-1">→ {insight.recommendedAction}</p>
                )}
                <div className="flex items-center gap-3 mt-2">
                  {insight.linkUrl && (
                    <button className="text-xs text-graphite-300 hover:text-white underline" onClick={() => router.push(insight.linkUrl!)}>
                      View
                    </button>
                  )}
                  <button
                    className="text-xs text-graphite-500 hover:text-graphite-300"
                    onClick={() => setExpandedId(expandedId === insight.id ? null : insight.id)}
                  >
                    Why am I seeing this?
                  </button>
                </div>
                {expandedId === insight.id && (
                  <p className="text-xs text-graphite-400 mt-2 italic">{insight.ruleExplanation}</p>
                )}
              </div>
              <button className="text-graphite-500 hover:text-white text-xs shrink-0" onClick={() => dismiss(insight.id)}>
                Dismiss
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
