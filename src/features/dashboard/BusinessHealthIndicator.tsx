"use client";
import { useEffect, useState } from "react";

type Finding = { label: string; score: number; max: number; detail: string };
type HealthData = {
  score: number;
  label: string;
  findings: Finding[];
  insights: string[];
  pipelineValue: number;
  pipelineCount: number;
};

function scoreColor(score: number) {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-emerald-300";
  if (score >= 40) return "text-amber-400";
  return "text-red-400";
}

export function BusinessHealthIndicator() {
  const [data, setData] = useState<HealthData | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch("/api/business-health")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) return null;

  return (
    <div className="card p-4">
      <button className="w-full flex items-center gap-3" onClick={() => setExpanded((e) => !e)}>
        <span className={`text-2xl font-bold ${scoreColor(data.score)}`}>{data.score}</span>
        <div className="text-left flex-1">
          <p className={`text-sm font-medium ${scoreColor(data.score)}`}>Business Health: {data.label}</p>
          {data.insights.length > 0 && !expanded && (
            <p className="text-xs text-graphite-400 truncate">{data.insights[0]}</p>
          )}
        </div>
        <span className="text-graphite-500 text-xs">{expanded ? "Hide breakdown" : "See breakdown"}</span>
      </button>

      {expanded && (
        <div className="mt-4 space-y-3">
          {data.insights.length > 0 && (
            <div className="space-y-1">
              {data.insights.map((insight, i) => (
                <p key={i} className="text-xs text-amber-300">⚠ {insight}</p>
              ))}
            </div>
          )}
          <div className="space-y-2">
            {data.findings.map((f) => (
              <div key={f.label}>
                <div className="flex items-center justify-between text-xs mb-0.5">
                  <span className="text-graphite-300">{f.label}</span>
                  <span className="text-graphite-400">{f.score}/{f.max}</span>
                </div>
                <div className="h-1.5 bg-graphite-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${f.score / f.max >= 0.6 ? "bg-emerald-500" : f.score / f.max >= 0.3 ? "bg-amber-500" : "bg-red-500"}`}
                    style={{ width: `${(f.score / f.max) * 100}%` }}
                  />
                </div>
                <p className="text-[11px] text-graphite-500 mt-0.5">{f.detail}</p>
              </div>
            ))}
          </div>
          {data.pipelineCount > 0 && (
            <p className="text-[11px] text-graphite-500 pt-2 border-t border-graphite-700">
              Context, not scored: ${data.pipelineValue.toLocaleString()} in {data.pipelineCount} open estimate{data.pipelineCount === 1 ? "" : "s"} (pipeline value).
            </p>
          )}
        </div>
      )}
    </div>
  );
}
