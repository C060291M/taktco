import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ScheduleCalendar } from "@/features/schedule/ScheduleCalendar";

function money(n: number | { toString(): string }) {
  return "$" + Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export default async function SchedulePage() {
  const ctx = await requireSession();
  if (!ctx) redirect("/login");

  const jobs = await db.job.findMany({
    where: { companyId: ctx.company.id, deletedAt: null, startDate: { not: null } },
    include: { customer: true },
    orderBy: { startDate: "asc" }
  });

  const tasks = await db.task.findMany({
    where: { companyId: ctx.company.id, dueDate: { not: null } },
    include: { customer: true, lead: true, job: { include: { customer: true } } },
    orderBy: { dueDate: "asc" }
  });

  const jobEvents = jobs.map(function (j) {
    return {
      id: j.id,
      kind: "job" as const,
      label: j.customer.name,
      status: j.status,
      startDate: j.startDate!.toISOString(),
      endDate: j.endDate ? j.endDate.toISOString() : j.startDate!.toISOString(),
      href: "/jobs/" + j.id,
      detail: j.projectAddress
    };
  });

  const taskEvents = tasks.map(function (t) {
    const dateIso = t.dueDate!.toISOString();
    const href = t.leadId ? "/pipeline/" + t.leadId : t.jobId ? "/jobs/" + t.jobId : "#";
    const who = t.lead ? t.lead.pipelineStage : t.customer ? t.customer.name : t.job ? t.job.customer.name : null;
    return {
      id: t.id,
      kind: "task" as const,
      label: t.title,
      status: t.completed ? "DONE" : "OPEN",
      startDate: dateIso,
      endDate: dateIso,
      href: href,
      detail: who
    };
  });

  const events = [...jobEvents, ...taskEvents];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-white">Schedule</h1>
        <p className="text-sm text-graphite-400">A quick calendar view of your scheduled projects and tasks.</p>
      </div>
      <ScheduleCalendar events={events} />
    </div>
  );
}

