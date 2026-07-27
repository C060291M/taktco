import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { Badge } from "@/components/ui/Badge";

function money(n: number | { toString(): string }) {
  return `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default async function JobDetailPage({ params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) redirect("/login");

  const job = await db.job.findFirst({
    where: { id: params.id, companyId: ctx.company.id },
    include: { customer: true, photos: true, invoices: true, estimate: true }
  });
  if (!job) notFound();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-white">Job for {job.customer.name}</h1>
        <Badge color={job.status === "COMPLETE" ? "green" : "yellow"}>{job.status.replace("_", " ")}</Badge>
      </div>

      <div className="card p-5 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-graphite-400">Quoted cost</p>
          <p className="text-white font-medium">{money(job.quotedCost)}</p>
        </div>
        <div>
          <p className="text-xs text-graphite-400">Actual cost so far</p>
          <p className="text-white font-medium">{money(job.actualCost)}</p>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-medium text-white mb-3">Before / after photos</h2>
        {job.photos.length === 0 ? (
          <p className="text-sm text-graphite-400">No photos uploaded yet. (Photo upload wiring is a Phase 2 item — storage is scaffolded via job_photos in the schema.)</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {job.photos.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p.id} src={p.url} alt={p.type} className="rounded-lg aspect-square object-cover" />
            ))}
          </div>
        )}
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-medium text-white mb-3">Invoices for this job</h2>
        {job.invoices.length === 0 && <p className="text-sm text-graphite-400">No invoices yet.</p>}
        <div className="space-y-2">
          {job.invoices.map((i) => (
            <div key={i.id} className="flex items-center justify-between text-sm">
              <span className="text-graphite-200">{money(i.amount)}</span>
              <Badge color={i.status === "PAID" ? "green" : "yellow"}>{i.status.replace("_", " ")}</Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
