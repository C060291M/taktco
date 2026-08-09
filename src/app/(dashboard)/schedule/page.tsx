import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ScheduleCalendar } from "@/features/schedule/ScheduleCalendar";

export default async function SchedulePage() {
  const ctx = await requireSession();
  if (!ctx) redirect("/login");

  const jobs = await db.job.findMany({
    where: { companyId: ctx.company.id, deletedAt: null, startDate: { not: null } },
    include: { customer: true },
    orderBy: { startDate: "asc" }
  });

  const events = jobs.map((j) => ({
    id: j.id,
    customerName: j.customer.name,
    status: j.status,
    startDate: j.startDate!.toISOString(),
    endDate: j.endDate ? j.endDate.toISOString() : j.startDate!.toISOString(),
    projectAddress: j.projectAddress
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-white">Schedule</h1>
        <p className="text-sm text-graphite-400">A quick calendar view of your scheduled projects.</p>
      </div>
      <ScheduleCalendar events={events} />
    </div>
  );
}
