import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { LeadQuickActions } from "./LeadQuickActions";
import { LeadNotesTasks } from "./LeadNotesTasks";
import { SetBreadcrumbLabel } from "@/components/layout/SetBreadcrumbLabel";
import { NewEstimateForm } from "@/features/estimates/NewEstimateForm";
import { NewContractForm } from "@/features/contracts/NewContractForm";
import { NewInvoiceForm } from "@/features/invoices/NewInvoiceForm";

function money(n: number | { toString(): string } | null) {
  if (n === null) return "-";
  return "$" + Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 });
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
  const commsSettings = await db.companyCommsSettings.findUnique({ where: { companyId: ctx.company.id }, select: { callMarksContacted: true } });

  const [estimates, contracts, invoices, jobs] = await Promise.all([
    db.estimate.findMany({ where: { customerId: lead.customerId, deletedAt: null }, orderBy: { createdAt: "desc" } }),
    db.contract.findMany({ where: { customerId: lead.customerId }, orderBy: { createdAt: "desc" } }),
    db.invoice.findMany({ where: { customerId: lead.customerId, deletedAt: null }, orderBy: { createdAt: "desc" } }),
    db.job.findMany({ where: { customerId: lead.customerId, deletedAt: null } })
  ]);

  const singleCustomerList = [{ id: lead.customer.id, name: lead.customer.name }];
  const jobOptions = jobs.map((j) => ({ id: j.id, label: "Job - " + money(j.quotedCost) + " quoted" }));

  return (
    <div className="space-y-6 max-w-3xl">
      <SetBreadcrumbLabel id={lead.id} label={"Lead #" + String(lead.leadNumber).padStart(3, "0")} />
      <div>
        <Link href="/pipeline" className="text-xs text-graphite-400 hover:text-white">Back to Pipeline</Link>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-graphite-400 font-mono">#{String(lead.leadNumber).padStart(3, "0")}</span>
          <h1 className="text-xl font-semibold text-white">{lead.customer.name}</h1>
          <Badge color="blue">{lead.pipelineStage.replace(/_/g, " ")}</Badge>
        </div>
        <p className="text-sm text-graphite-400">
          {lead.customer.phone || "No phone"} - {lead.customer.email || "No email"}
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs text-graphite-400">Est. value</p>
          <p className="text-white font-medium">{money(lead.estimatedValue)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-graphite-400">Probability</p>
          <p className="text-white font-medium">{lead.probability !== null ? lead.probability + "%" : "-"}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-graphite-400">Expected close</p>
          <p className="text-white font-medium">{lead.expectedCloseDate ? new Date(lead.expectedCloseDate).toLocaleDateString() : "-"}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-graphite-400">Source</p>
          <p className="text-white font-medium">{lead.leadSource ? lead.leadSource.name : (lead.source || "-")}</p>
        </div>
      </div>
      <LeadQuickActions
        leadId={lead.id}
        customerId={lead.customerId}
        customerPhone={lead.customer.phone}
        customerEmail={lead.customer.email}
        pipelineStage={lead.pipelineStage}
        callMarksContacted={commsSettings?.callMarksContacted ?? false}
        canManageSettings={ctx.user.role === "OWNER" || ctx.user.role === "ADMIN"}
        assignedUserId={lead.assignedUserId}
        teamMembers={teamMembers}
        canDelete={ctx.user.role === "OWNER"}
      />

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="card p-5">
          <h2 className="text-sm font-medium text-white mb-3">Estimates</h2>
          {estimates.length === 0 && <p className="text-sm text-graphite-400 mb-3">None yet.</p>}
          <div className="space-y-2 mb-3">
            {estimates.map((e) => (
              <div key={e.id} className="flex items-center justify-between text-sm">
                <span className="text-graphite-200">{money(e.totalAmount)}</span>
                <Badge color={e.status === "APPROVED" ? "green" : e.status === "DECLINED" ? "red" : "blue"}>{e.status}</Badge>
              </div>
            ))}
          </div>
          <NewEstimateForm
            customers={singleCustomerList}
            defaultCustomerId={lead.customer.id}
            defaultWarranty={ctx.company.defaultWarrantyText}
            defaultTerms={ctx.company.defaultEstimateTerms}
          />
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-medium text-white mb-3">Contracts</h2>
          {contracts.length === 0 && <p className="text-sm text-graphite-400 mb-3">None yet.</p>}
          <div className="space-y-2 mb-3">
            {contracts.map((c) => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <span className="text-graphite-200">{c.title}</span>
                <Badge color={c.status === "SIGNED" ? "green" : c.status === "DECLINED" ? "red" : "blue"}>{c.status}</Badge>
              </div>
            ))}
          </div>
          <NewContractForm customers={singleCustomerList} defaultCustomerId={lead.customer.id} companyName={ctx.company.name} />
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-medium text-white mb-3">Invoices</h2>
          {invoices.length === 0 && <p className="text-sm text-graphite-400 mb-3">None yet.</p>}
          <div className="space-y-2 mb-3">
            {invoices.map((i) => (
              <div key={i.id} className="flex items-center justify-between text-sm">
                <span className="text-graphite-200">{money(i.amount)}</span>
                <Badge color={i.status === "PAID" ? "green" : i.status === "OVERDUE" ? "red" : "yellow"}>{i.status.replace("_", " ")}</Badge>
              </div>
            ))}
          </div>
          <NewInvoiceForm
            customers={singleCustomerList}
            defaultCustomerId={lead.customer.id}
            jobs={jobOptions}
            defaultDueDays={ctx.company.defaultInvoiceDueDays}
            hasDepositPercent={Boolean(ctx.company.defaultDepositPercent)}
          />
        </div>
      </div>

      <LeadNotesTasks leadId={lead.id} notes={lead.noteEntries} tasks={lead.tasks} />

      <div className="card p-5">
        <h2 className="text-sm font-medium text-white mb-2">Notes from the pipeline card</h2>
        <p className="text-sm text-graphite-300">{lead.notes || "No notes."}</p>
      </div>
    </div>
  );
}


