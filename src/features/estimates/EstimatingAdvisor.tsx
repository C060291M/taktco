import type { AdvisorFinding } from "@/lib/estimatingAdvisor";

// Server-rendered, not a client fetch - the analysis already ran server-side
// on the estimate detail page (see analyzeEstimate call there). No loading
// state needed since there's no client round-trip.
export function EstimatingAdvisor({ findings }: { findings: AdvisorFinding[] }) {
  if (findings.length === 0) return null;

  return (
    <div className="card p-5 border-accent/30">
      <p className="text-[11px] text-accent uppercase tracking-wide mb-2">Estimating advisor</p>
      <div className="space-y-2">
        {findings.map((f, i) => (
          <p key={i} className={`text-sm ${f.severity === "warning" ? "text-amber-300" : "text-graphite-300"}`}>
            {f.severity === "warning" ? "⚠ " : "ℹ "}{f.message}
          </p>
        ))}
      </div>
    </div>
  );
}
