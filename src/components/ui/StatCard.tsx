export function StatCard({ label, value, sublabel }: { label: string; value: string; sublabel?: string }) {
  return (
    <div className="card p-5">
      <p className="text-xs text-graphite-300 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-semibold text-white mt-2">{value}</p>
      {sublabel && <p className="text-xs text-graphite-400 mt-1">{sublabel}</p>}
    </div>
  );
}
