// Plain CSS bar chart - no charting library. Keeps the bundle light and avoids
// adding a dependency just for six bars; revisit with recharts if analytics
// grows into something with zooming/tooltips/multiple series.
export function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="flex items-end gap-3 h-40">
      {data.map((d) => (
        <div key={d.label} className="flex-1 flex flex-col items-center justify-end h-full">
          <div className="w-full flex-1 flex items-end">
            <div
              className="w-full rounded-t"
              style={{
                height: `${Math.max(4, (d.value / max) * 100)}%`,
                backgroundColor: "var(--brand-accent, #3B82F6)",
                opacity: d.value === 0 ? 0.25 : 1
              }}
              title={`${d.label}: ${d.value.toLocaleString()}`}
            />
          </div>
          <p className="text-[10px] text-graphite-400 mt-2 uppercase tracking-wide">{d.label}</p>
        </div>
      ))}
    </div>
  );
}
