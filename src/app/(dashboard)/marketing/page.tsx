import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MarketingGenerator } from "@/features/marketing/MarketingGenerator";

const PLATFORM_LABELS: Record<string, string> = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  GOOGLE_BUSINESS: "Google Business",
  LINKEDIN: "LinkedIn",
  BLOG: "Blog"
};

export default async function MarketingPage() {
  const ctx = await requireSession();
  if (!ctx) redirect("/login");

  const items = await db.marketingContent.findMany({
    where: { companyId: ctx.company.id },
    orderBy: { createdAt: "desc" },
    take: 50
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Marketing AI</h1>
        <p className="text-sm text-graphite-400">Generate social posts, blog content, and updates in your brand voice.</p>
      </div>

      <MarketingGenerator />

      <div className="space-y-3">
        {items.length === 0 && (
          <div className="card p-8 text-center">
            <p className="text-sm text-graphite-400">Nothing generated yet — describe a post above to get started.</p>
          </div>
        )}
        {items.map((item) => (
          <div key={item.id} className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-graphite-400 uppercase tracking-wide">{PLATFORM_LABELS[item.platform]}</span>
              <span className="text-xs text-graphite-500">{new Date(item.createdAt).toLocaleDateString()}</span>
            </div>
            <p className="text-xs text-graphite-500 mb-2 italic">"{item.prompt}"</p>
            <p className="text-sm text-graphite-100 whitespace-pre-wrap">{item.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
