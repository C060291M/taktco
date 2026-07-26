import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";

export default async function PortfolioPage() {
  const ctx = await requireSession();
  if (!ctx) redirect("/login");

  const jobs = await db.job.findMany({
    where: { companyId: ctx.company.id, photos: { some: {} }, portfolioHidden: false },
    include: { customer: true, photos: true },
    orderBy: [{ portfolioFeatured: "desc" }, { createdAt: "desc" }]
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Portfolio</h1>
        <p className="text-sm text-graphite-400">Completed and in-progress work, straight from your job photos.</p>
      </div>

      {jobs.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-graphite-400">
            No project photos yet. Add before/after photos on a job to build your portfolio automatically.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {jobs.map((job) => {
            const before = job.photos.find((p) => p.type === "BEFORE");
            const after = job.photos.find((p) => p.type === "AFTER");
            const cover = after || before || job.photos[0];
            return (
              <div key={job.id} className="card overflow-hidden hover:border-accent/50 transition-colors">
                <Link href={`/jobs/${job.id}`} className="block">
                  {before && after ? (
                    <div className="grid grid-cols-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={before.url} alt="Before" className="aspect-square object-cover" />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={after.url} alt="After" className="aspect-square object-cover" />
                    </div>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cover.url} alt={job.customer.name} className="aspect-video w-full object-cover" />
                  )}
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">{job.customer.name}</p>
                      <p className="text-xs text-graphite-400">
                        {job.category ? `${job.category} · ` : ""}{job.photos.length} photo{job.photos.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {job.portfolioFeatured && <Badge color="blue">Featured</Badge>}
                      <Badge color={job.status === "COMPLETE" || job.status === "CLOSED" ? "green" : "yellow"}>{job.status.replace(/_/g, " ")}</Badge>
                    </div>
                  </div>
                </Link>
                <div className="px-4 pb-4">
                  <Link href={`/marketing?jobId=${job.id}`} className="text-xs text-accent hover:underline">✨ Generate a post from this project</Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
