import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { LeadQuickActions } from "./LeadQuickActions";
import { LeadNotesTasks } from "./LeadNotesTasks";

function money(n: number | { toString(): string } | null) {
  if (n === null) return "—";
  return `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const ctx = await requireSession();
  if (!ctx) redirect("/login");

  const lead = await db.lead.findFirst({
    where: { id: params.id, companyId: ctx.company.id },
    include: {
      customer: true,
      assignedUser: true,
      leadSource: true,
      tasks: { orderBy: { createdAt: "desc" } },
      noteEntries: { orderBy: { createdAt: "desc" }, include: { author: true } }
    }
  });
  if (!lead) notFound();

  const teamMembers = await db.user.findMany({ where: { companyId: ctx.company.id }, select: { id: true, name: true } });

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link href="/pipeline" className="text-xs text-graphite-400 hover:text-white">← Pipeline</Link>
        <div className="flex items-center gap-2 mt-2">
          <h1 className="text-xl font-semibold text-white">{lead.customer.name}</h1>
          <Badge color="blue">{lead.pipelineStage.replace(/_/g, " ")}</Badge>
        </div>
        <p className="text-sm text-graphite-400">
          {lead.customer.phone || "No phone"} · {lead.customer.email || "No email"}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs text-graphite-400">Est. value</p>
          <p className="text-white font-medium">{money(lead.estimatedValue)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-graphite-400">Probability</p>
          <p className="text-white font-medium">{lead.probability !== null ? `${lead.probability}%` : "—"}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-graphite-400">Expected close</p>
          <p className="text-white font-medium">{lead.expectedCloseDate ? new Date(lead.expectedCloseDate).toLocaleDateString() : "—"}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-graphite-400">Source</p>
          <p className="text-white font-medium">{lead.leadSource?.name || lead.source || "—"}</p>
        </div>
      </div>

      <LeadQuickActions
        leadId={lead.id}
        customerId={lead.customerId}
        customerPhone={lead.customer.phone}
        customerEmail={lead.customer.email}
        assignedUserId={lead.assignedUserId}
        teamMembers={teamMembers}
        canDelete={ctx.user.role === "OWNER" || ctx.user.role === "ADMIN"}
      />

      <LeadNotesTasks leadId={lead.id} notes={lead.noteEntries} tasks={lead.tasks} />

      <div className="card p-5">
        <h2 className="text-sm font-medium text-white mb-2">Notes from the pipeline card</h2>
        <p className="text-sm text-graphite-300">{lead.notes || "No notes."}</p>
      </div>
    </div>
  );
}
