import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { JobPhotoUploader } from "@/features/jobs/JobPhotoUploader";
import { ChangeOrdersPanel } from "@/features/jobs/ChangeOrdersPanel";
import { DailyLogPanel } from "@/features/jobs/DailyLogPanel";
import { PunchListPanel } from "@/features/jobs/PunchListPanel";
import { CrewAndStatus } from "@/features/jobs/CrewAndStatus";
import { DeleteJobButton } from "@/features/jobs/DeleteJobButton";
import { TechSignOff } from "@/features/jobs/TechSignOff";

function money(n: number | { toString(): string }) {
  return "$" + Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

const PHOTO_GROUPS = [
  { type: "BEFORE", label: "Before" },
  { type: "PROGRESS", label: "Progress" },
  { type: "AFTER", label: "After" },
  { type: "INSPECTION", label: "Inspection" },
  { type: "WARRANTY", label: "Warranty" },
  { type: "MISC", label: "Misc" }
];

export default async function JobDetailPage({ params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) redirect("/login");

  const isFieldTech = ctx.user.role === "FIELD_TECH";

  const [job, teamMembers, dailyLogs] = await Promise.all([
    db.job.findFirst({
      where: { id: params.id, companyId: ctx.company.id, deletedAt: null },
      include: { customer: true, photos: true, invoices: true, estimate: true, changeOrders: true, punchListItems: true }
    }),
    db.user.findMany({ where: { companyId: ctx.company.id }, select: { id: true, name: true } }),
    db.dailyLog.findMany({ where: { companyId: ctx.company.id, jobId: params.id }, include: { author: true }, orderBy: { date: "desc" } })
  ]);
  if (!job) notFound();
  if (isFieldTech && !job.assignedUserIds.includes(ctx.user.id)) notFound();

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Job for {job.customer.name}</h1>
          <Badge color={job.status === "COMPLETE" || job.status === "CLOSED" ? "green" : "yellow"}>{job.status.replace(/_/g, " ")}</Badge>
        </div>
        {ctx.user.role === "OWNER" && (
          <DeleteJobButton jobId={job.id} customerName={job.customer.name} />
        )}
      </div>

      {!isFieldTech && (
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
      )}

      <TechSignOff
        jobId={job.id}
        isFieldTech={isFieldTech}
        techSignedOffByName={job.techSignedOffByName}
        techSignedOffAt={job.techSignedOffAt ? job.techSignedOffAt.toISOString() : null}
      />

      <CrewAndStatus jobId={job.id} status={job.status} assignedUserIds={job.assignedUserIds} teamMembers={teamMembers} startDate={job.startDate ? job.startDate.toISOString() : null} endDate={job.endDate ? job.endDate.toISOString() : null} />

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-white">Photos</h2>
          <JobPhotoUploader jobId={job.id} />
        </div>
        {job.photos.length === 0 ? (
          <p className="text-sm text-graphite-400">No photos yet - add a before shot to get started.</p>
        ) : (
          <div className="space-y-4">
            {PHOTO_GROUPS.map(function (group) {
              const groupPhotos = job.photos.filter(function (p) { return p.type === group.type; });
              if (groupPhotos.length === 0) return null;
              return (
                <div key={group.type}>
                  <p className="text-xs text-graphite-400 uppercase tracking-wide mb-2">{group.label}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {groupPhotos.map(function (p) {
                      return (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={p.id} src={p.url} alt={p.caption || group.label} title={p.caption || undefined} className="rounded-lg aspect-square object-cover" />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <DailyLogPanel
        jobId={job.id}
        logs={dailyLogs.map(function (l) {
          return {
            id: l.id,
            date: l.date.toISOString(),
            weather: l.weather,
            workCompleted: l.workCompleted,
            issues: l.issues,
            author: l.author ? { name: l.author.name } : null
          };
        })}
      />

      <PunchListPanel
        jobId={job.id}
        items={job.punchListItems.map(function (i) {
          return { id: i.id, description: i.description, priority: i.priority, status: i.status };
        })}
      />

      {!isFieldTech && (
        <ChangeOrdersPanel
          jobId={job.id}
          changeOrders={job.changeOrders.map(function (co) {
            return {
              id: co.id,
              description: co.description,
              amountDelta: Number(co.amountDelta),
              status: co.status,
              signedByName: co.signedByName
            };
          })}
        />
      )}

      {!isFieldTech && (
        <div className="card p-5">
          <h2 className="text-sm font-medium text-white mb-3">Invoices for this job</h2>
          {job.invoices.length === 0 ? (
            <p className="text-sm text-graphite-400">No invoices yet.</p>
          ) : (
            <div className="space-y-2">
              {job.invoices.map(function (i) {
                return (
                  <div key={i.id} className="flex items-center justify-between text-sm">
                    <span className="text-graphite-200">{money(i.amount)}</span>
                    <Badge color={i.status === "PAID" ? "green" : "yellow"}>{i.status.replace("_", " ")}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
