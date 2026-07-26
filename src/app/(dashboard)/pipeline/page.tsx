import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PipelineBoard } from "@/features/pipeline/PipelineBoard";

export default async function PipelinePage() {
  const ctx = await requireSession();
  if (!ctx) redirect("/login");

  const leads = await db.lead.findMany({
    where: { companyId: ctx.company.id },
    include: { customer: true },
    orderBy: { createdAt: "desc" }
  });

  const serializable = leads.map((l) => ({
    id: l.id,
    pipelineStage: l.pipelineStage,
    customerName: l.customer.name,
    customerId: l.customer.id,
    notes: l.notes,
    priority: l.priority
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Sales pipeline</h1>
        <p className="text-sm text-graphite-400">Drag a card to move it to the next stage.</p>
      </div>
      <PipelineBoard initialLeads={serializable} />
    </div>
  );
}
