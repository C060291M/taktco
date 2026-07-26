"use client";
import { useEffect, useState } from "react";

const STATUS_CONFIG = {
  healthy: { emoji: "🟢", label: "Healthy", color: "text-emerald-400" },
  attention: { emoji: "🟡", label: "Needs attention", color: "text-amber-400" },
  action_required: { emoji: "🔴", label: "Action required", color: "text-red-400" }
};

export function BusinessHealthIndicator() {
  const [data, setData] = useState<{ status: keyof typeof STATUS_CONFIG; reasons: string[] } | null>(null);

  useEffect(() => {
    fetch("/api/business-health")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) return null;
  const config = STATUS_CONFIG[data.status];

  return (
    <div className="card p-4 flex items-center gap-3">
      <span className="text-2xl">{config.emoji}</span>
      <div>
        <p className={`text-sm font-medium ${config.color}`}>{config.label}</p>
        {data.reasons.length > 0 && (
          <p className="text-xs text-graphite-400">{data.reasons.join(" · ")}</p>
        )}
      </div>
    </div>
  );
}
