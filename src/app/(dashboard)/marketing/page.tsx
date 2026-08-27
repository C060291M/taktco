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

export default async function MarketingPage({ searchParams }: { searchParams: { jobId?: string } }) {
  const ctx = await requireSession();
  if (!ctx) redirect("/login");

  const items = await db.marketingContent.findMany({
    where: { companyId: ctx.company.id },
    orderBy: { createdAt: "desc" },
    take: 50
  });

  const jobId = searchParams.jobId;
  const job = jobId
    ? await db.job.findFirst({ where: { id: jobId, companyId: ctx.company.id }, include: { photos: true } })
    : null;
  const beforePhoto = job ? job.photos.find(function (p) { return p.type === "BEFORE"; }) : null;
  const afterPhoto = job ? job.photos.find(function (p) { return p.type === "AFTER"; }) : null;
  const anyPhoto = job ? job.photos[0] : null;
  const hasPhotos = Boolean(job) && job!.photos.length > 0;
  const flyerUrl = job ? "/api/marketing/flyer?jobId=" + job.id : "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Marketing AI</h1>
        <p className="text-sm text-graphite-400">Generate social posts, blog content, and updates in your brand voice.</p>
      </div>

      {job && hasPhotos ? (
        <div className="card p-5">
          <p className="text-xs text-graphite-400 uppercase tracking-wide mb-3">Project photos</p>
          {beforePhoto && afterPhoto ? (
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={beforePhoto.url} alt="Before" className="w-full aspect-video object-cover rounded-lg" />
                <p className="text-[11px] text-graphite-500 text-center mt-1">Before</p>
              </div>
              <div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={afterPhoto.url} alt="After" className="w-full aspect-video object-cover rounded-lg" />
                <p className="text-[11px] text-graphite-500 text-center mt-1">After</p>
              </div>
            </div>
          ) : anyPhoto ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={anyPhoto.url} alt="Project" className="w-full aspect-video object-cover rounded-lg mb-4" />
          ) : null}
          <a href={flyerUrl} className="btn-primary inline-block text-sm">
            Download Flyer (PDF)
          </a>
          <p className="text-[11px] text-graphite-500 mt-2">
            A ready-to-share flyer with your logo, this project's photos, and a headline pulled from your latest generated post below.
          </p>
        </div>
      ) : null}

      <MarketingGenerator />

      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-sm text-graphite-400">Nothing generated yet - describe a post above to get started.</p>
          </div>
        ) : null}
        {items.map(function (item) {
          return (
            <div key={item.id} className="card p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-graphite-400 uppercase tracking-wide">{PLATFORM_LABELS[item.platform] || item.platform}</span>
                <span className="text-xs text-graphite-500">{new Date(item.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="text-xs text-graphite-500 mb-2 italic">"{item.prompt}"</p>
              <p className="text-sm text-graphite-100 whitespace-pre-wrap">{item.content}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
