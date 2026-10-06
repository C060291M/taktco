import { db } from "@/database/client";
import { StatCard } from "@/components/ui/StatCard";
import { Eye, Users } from "lucide-react";
import { ADMIN_INTERNAL_SUBDOMAIN } from "@/lib/admin";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function LandingTraffic() {
  const now = new Date();
  const startOfUtcDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const since24h = new Date(now.getTime() - DAY_MS);
  const since7d = new Date(now.getTime() - 7 * DAY_MS);
  const since30d = new Date(now.getTime() - 30 * DAY_MS);
  // Aligned to the first chart bucket so the chart and source list agree.
  const since14d = new Date(startOfUtcDay.getTime() - 13 * DAY_MS);

  const customerFilter = { subdomain: { not: ADMIN_INTERNAL_SUBDOMAIN } };

  const [views24h, views7d, views30d, recent, signups30d, signups7d] = await Promise.all([
    db.pageView.count({ where: { path: "/", createdAt: { gte: since24h } } }),
    db.pageView.count({ where: { path: "/", createdAt: { gte: since7d } } }),
    db.pageView.count({ where: { path: "/", createdAt: { gte: since30d } } }),
    db.pageView.findMany({
      where: { path: "/", createdAt: { gte: since14d } },
      select: { createdAt: true, visitorHash: true, referrer: true, utmSource: true },
      orderBy: { createdAt: "asc" },
      take: 50000
    }),
    db.company.count({ where: { ...customerFilter, createdAt: { gte: since30d } } }),
    db.company.count({ where: { ...customerFilter, createdAt: { gte: since7d } } })
  ]);

  // 14 daily buckets, by UTC day (the same boundary the visitor hash rotates on).
  const days: { key: string; label: string; views: number; visitors: Set<string> }[] = [];
  for (let i = 13; i >= 0; i--) {
    const key = new Date(startOfUtcDay.getTime() - i * DAY_MS).toISOString().slice(0, 10);
    days.push({ key, label: key.slice(5), views: 0, visitors: new Set<string>() });
  }
  const byKey = new Map(days.map((d) => [d.key, d]));
  const sourceCounts = new Map<string, number>();

  for (const v of recent) {
    const bucket = byKey.get(v.createdAt.toISOString().slice(0, 10));
    if (bucket) {
      bucket.views += 1;
      bucket.visitors.add(v.visitorHash);
    }
    const source = v.utmSource ? `utm: ${v.utmSource}` : v.referrer || "Direct / unknown";
    sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
  }

  const today = byKey.get(startOfUtcDay.toISOString().slice(0, 10));
  const uniqueToday = today ? today.visitors.size : 0;
  const maxViews = Math.max(1, ...days.map((d) => d.views));
  const topSources = Array.from(sourceCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-medium text-white">Landing page traffic</h2>
        <p className="text-xs text-graphite-400">
          Anonymous page views of the public landing page. Bots are filtered out and no IP addresses are stored.
          Counting started when this was deployed, so there is no earlier history.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Views (24h)" value={String(views24h)} icon={Eye} tone="accent" />
        <StatCard label="Views (7d)" value={String(views7d)} icon={Eye} tone="neutral" />
        <StatCard label="Views (30d)" value={String(views30d)} icon={Eye} tone="neutral" />
        <StatCard label="Unique visitors today (UTC)" value={String(uniqueToday)} icon={Users} tone="neutral" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="text-sm font-medium text-white mb-3">Views per day (last 14 days, UTC)</h3>
          <div className="flex items-end gap-1 h-32">
            {days.map((d) => (
              <div key={d.key} className="flex-1 h-full flex items-end" title={`${d.key}: ${d.views} views, ${d.visitors.size} unique`}>
                <div
                  className="w-full bg-accent/70 rounded-sm"
                  style={{ height: `${Math.round((d.views / maxViews) * 100)}%`, minHeight: d.views > 0 ? "2px" : "0" }}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-1 mt-1">
            {days.map((d, i) => (
              <span key={d.key} className="flex-1 text-center text-[9px] text-graphite-500">{i % 2 === 0 ? d.label : ""}</span>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-medium text-white mb-3">Top sources (last 14 days)</h3>
          {topSources.length === 0 ? (
            <p className="text-sm text-graphite-400">No views recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {topSources.map(([source, count]) => (
                <div key={source} className="flex items-center justify-between text-sm">
                  <span className="text-graphite-200">{source}</span>
                  <span className="text-graphite-400">{count}</span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 pt-3 border-t border-graphite-700 text-sm text-graphite-400">
            New signups: <span className="text-white">{signups7d}</span> in the last 7 days &middot; <span className="text-white">{signups30d}</span> in the last 30 days
          </div>
        </div>
      </div>
    </div>
  );
}