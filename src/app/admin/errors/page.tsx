import { db } from "@/database/client";
import { Badge } from "@/components/ui/Badge";

function severityColor(s: string) {
  if (s === "CRITICAL") return "red";
  if (s === "HIGH") return "red";
  if (s === "MEDIUM") return "yellow";
  return "gray";
}

export default async function AdminErrorsPage() {
  const errors = await db.errorLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { company: true }
  });

  const bySeverity = await db.errorLog.groupBy({
    by: ["severity"],
    _count: true,
    where: { resolved: false }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Error Console</h1>
        <p className="text-sm text-graphite-400">Every logged failure across every tenant, most recent first.</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((s) => {
          const count = bySeverity.find((b) => b.severity === s)?._count || 0;
          return (
            <div key={s} className="card p-4">
              <p className="text-xs text-graphite-400 uppercase">{s}</p>
              <p className="text-2xl font-semibold text-white mt-1">{count}</p>
            </div>
          );
        })}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-graphite-400 border-b border-graphite-700">
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Module</th>
              <th className="px-4 py-3 font-medium">Severity</th>
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium">Message</th>
            </tr>
          </thead>
          <tbody>
            {errors.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-graphite-400">No errors logged yet.</td></tr>
            )}
            {errors.map((e) => (
              <tr key={e.id} className="border-b border-graphite-700 last:border-0">
                <td className="px-4 py-3 text-graphite-400 text-xs whitespace-nowrap">{e.createdAt.toLocaleString()}</td>
                <td className="px-4 py-3 text-graphite-300">{e.module}</td>
                <td className="px-4 py-3"><Badge color={severityColor(e.severity)}>{e.severity}</Badge></td>
                <td className="px-4 py-3 text-graphite-400 text-xs">{e.company?.name || "—"}</td>
                <td className="px-4 py-3 text-graphite-200 text-xs max-w-md truncate" title={e.message}>{e.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
