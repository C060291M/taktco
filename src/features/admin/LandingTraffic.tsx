import { db } from "@/database/client";
import { StatCard } from "@/components/ui/StatCard";
import { Eye, Users } from "lucide-react";
import { ADMIN_INTERNAL_SUBDOMAIN } from "@/lib/admin";

const DAY_MS = 24 * 60 * 60 * 1000;
const CHART_HEIGHT_PX = 128;
const TZ = "America/Chicago";

// Calendar date (YYYY-MM-DD) of an instant, in Central time.
const centralDay = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ });

export async function LandingTraffic() {
  const now = new Date();
  const todayKey = centralDay(now);
  const [ty, tm, td] = todayKey.split("-").map(Number);
  const since24h = new Date(now.getTime() - DAY_MS);
  const since7d = new Date(now.getTime() - 7 * DAY_MS);
  const since30d = new Date(now.getTime() - 30 * DAY_MS);
  // Fetch a day more than the chart needs; anything outside the 14 Central-time buckets is ignored below,
  // so the chart and the source list always agree.
  const since14d = new Date(Date.UTC(ty, tm - 1, td - 14));

  const customerFilter = { subdomain: { not: ADMIN_INTERNAL_SUBDOMAIN } };

  const [views24h, views7d, views30d, viewsAllTime, recent, signups30d, signups7d, signupViews7d, signupViews30d] = await Promise.all([
    db.pageView.count({ where: { path: "/", createdAt: { gte: since24h } } }),
    db.pageView.count({ where: { path: "/", createdAt: { gte: since7d } } }),
    db.pageView.count({ where: { path: "/", createdAt: { gte: since30d } } }),
    db.pageView.count({ where: { path: "/" } }),
    db.pageView.findMany({
      where: { path: "/", createdAt: { gte: since14d } },
      select: { createdAt: true, visitorHash: true, referrer: true, utmSource: true },
      orderBy: { createdAt: "asc" },
      take: 50000
    }),
    db.company.count({ where: { ...customerFilter, createdAt: { gte: since30d } } }),
    db.company.count({ where: { ...customerFilter, createdAt: { gte: since7d } } }),
    db.pageView.count({ where: { path: "/signup", createdAt: { gte: since7d } } }),
    db.pageView.count({ where: { path: "/signup", createdAt: { gte: since30d } } })
  ]);

  // 14 daily buckets by Central-time calendar day (the same boundary the visitor hash rotates on).
  const waitlistCount = await db.waitlistEntry.count().catch(() => 0);

  const days: { key: string; label: string; views: number; visitors: Set<string> }[] = [];
  for (let i = 13; i >= 0; i--) {
    const key = new Date(Date.UTC(ty, tm - 1, td - i)).toISOString().slice(0, 10);
    days.push({ key, label: key.slice(5), views: 0, visitors: new Set<string>() });
  }
  const byKey = new Map(days.map((d) => [d.key, d]));
  const sourceCounts = new Map<string, number>();

  for (const v of recent) {
    const bucket = byKey.get(centralDay(v.createdAt));
    if (!bucket) continue;
    bucket.views += 1;
    bucket.visitors.add(v.visitorHash);
    const source = v.utmSource ? `utm: ${v.utmSource}` : v.referrer || "Direct / unknown";
    sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
  }

  const today = byKey.get(todayKey);
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

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="Views (24h)" value={String(views24h)} icon={Eye} tone="accent" />
        <StatCard label="Views (7d)" value={String(views7d)} icon={Eye} tone="neutral" />
        <StatCard label="Views (30d)" value={String(views30d)} icon={Eye} tone="neutral" />
        <StatCard label="Views (all time)" value={String(viewsAllTime)} icon={Eye} tone="neutral" />
        <StatCard label="Unique visitors today" value={String(uniqueToday)} icon={Users} tone="neutral" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="text-sm font-medium text-white mb-3">Views per day (last 14 days, Central time)</h3>
          <div className="flex items-end gap-1" style={{ height: CHART_HEIGHT_PX }}>
            {days.map((d) => (
              <div
                key={d.key}
                className="flex-1 flex items-end"
                style={{ height: CHART_HEIGHT_PX }}
                title={`${d.key}: ${d.views} views, ${d.visitors.size} unique`}
              >
                <div
                  className="w-full rounded-sm"
                  style={{
                    height: d.views > 0 ? Math.max(4, Math.round((d.views / maxViews) * CHART_HEIGHT_PX)) : 0,
                    backgroundColor: "rgba(31, 198, 242, 0.8)"
                  }}
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
            Signup page views: <span className="text-white">{signupViews7d}</span> in the last 7 days &middot; <span className="text-white">{signupViews30d}</span> in the last 30 days
            <div className="mt-1">
              New signups: <span className="text-white">{signups7d}</span> in the last 7 days &middot; <span className="text-white">{signups30d}</span> in the last 30 days</div><div className="mt-1">Waitlist: <a href="/admin/waitlist" className="text-white underline">{waitlistCount}</a> waiting
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}