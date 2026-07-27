import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { JobsBoard } from "./JobsBoard";

export default async function JobsPage() {
  const ctx = await requireSession();
  if (!ctx) redirect("/login");

  const jobs = await db.job.findMany({
    where: { companyId: ctx.company.id },
    include: { customer: true },
    orderBy: { createdAt: "desc" }
  });

  const serializable = jobs.map((j) => ({
    id: j.id,
    status: j.status,
    customerName: j.customer.name,
    quotedCost: Number(j.quotedCost)
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Jobs</h1>
        <p className="text-sm text-graphite-400">Every active and completed job.</p>
      </div>
      <JobsBoard initialJobs={serializable} />
    </div>
  );
}
