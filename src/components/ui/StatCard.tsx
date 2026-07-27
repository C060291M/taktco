import type { LucideIcon } from "lucide-react";

const TONE_COLORS: Record<string, string> = {
  positive: "#22C55E", // green - money earned, good counts
  warning: "#F59E0B",  // amber - needs attention (outstanding invoices, overdue)
  neutral: "#8A8F98",  // gray - informational, zero states
  accent: "var(--brand-accent, #3B82F6)" // tenant's own brand color
};

export function StatCard({
  label,
  value,
  sublabel,
  icon: Icon,
  tone = "accent"
}: {
  label: string;
  value: string;
  sublabel?: string;
  icon?: LucideIcon;
  tone?: "positive" | "warning" | "neutral" | "accent";
}) {
  const color = TONE_COLORS[tone];
  return (
    <div className="card p-5 relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: color }} />
      <div className="flex items-start justify-between pl-2">
        <div>
          <p className="text-xs text-graphite-300 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-semibold mt-2" style={{ color: tone === "neutral" ? "#fff" : color }}>
            {value}
          </p>
          {sublabel && <p className="text-xs text-graphite-400 mt-1">{sublabel}</p>}
        </div>
        {Icon && (
          <div
            className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${color}1F` }}
          >
            <Icon size={18} color={color} />
          </div>
        )}
      </div>
    </div>
  );
}
