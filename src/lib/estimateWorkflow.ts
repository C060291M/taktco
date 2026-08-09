import { db } from "@/database/client";
import { getContractTemplate } from "@/lib/contractTemplates";
import { runTrigger } from "@/lib/automationEngine";
import { notify } from "@/lib/notify";

// Runs everything that should happen automatically when a customer (or staff,
// simulating one) approves an estimate: create the Job, move the Lead to Won,
// draft a starter Service Agreement contract, notify the office, and fire the
// ESTIMATE_APPROVED automation trigger for any workflows a company has set up.
// Shared by both the internal (staff) and public (customer-facing) approval
// routes so the two stay in sync.
export async function runEstimateApprovalWorkflow(estimate: {
  id: string;
  companyId: string;
  customerId: string;
  totalAmount: unknown;
}) {
  const customer = await db.customer.findUnique({ where: { id: estimate.customerId } });

  const existingJob = await db.job.findUnique({ where: { estimateId: estimate.id } });
  if (!existingJob) {
    await db.job.create({
      data: {
        companyId: estimate.companyId,
        customerId: estimate.customerId,
        estimateId: estimate.id,
        quotedCost: estimate.totalAmount as never,
        status: "SCHEDULED"
      }
    });
  }

  await db.lead.updateMany({
    where: { companyId: estimate.companyId, customerId: estimate.customerId },
    data: { pipelineStage: "WON" }
  });

  const existingContract = await db.contract.findFirst({
    where: { companyId: estimate.companyId, customerId: estimate.customerId, type: "SERVICE_AGREEMENT" }
  });
  if (!existingContract) {
    const company = await db.company.findUnique({ where: { id: estimate.companyId } });
    const fullEstimate = await db.estimate.findUnique({ where: { id: estimate.id } });
    if (company && customer && fullEstimate) {
      await db.contract.create({
        data: {
          companyId: estimate.companyId,
          customerId: estimate.customerId,
          type: "SERVICE_AGREEMENT",
          title: "Service Agreement",
          content: getContractTemplate("SERVICE_AGREEMENT", company.name, customer.name, {
            lineItems: fullEstimate.lineItems as unknown as { description: string; qty: number; unit: string; unitPrice: number }[],
            totalAmount: Number(fullEstimate.totalAmount),
            terms: fullEstimate.terms
          }),
          status: "DRAFT"
        }
      });
    }
  }

  await notify({
    companyId: estimate.companyId,
    category: "ESTIMATE_APPROVED",
    title: `${customer?.name || "A customer"} approved their estimate`,
    body: `$${Number(estimate.totalAmount).toLocaleString()} — a job and starter contract were created automatically.`,
    linkUrl: `/estimates/${estimate.id}`
  });

  await runTrigger(estimate.companyId, "ESTIMATE_APPROVED", {
    companyId: estimate.companyId,
    customerId: estimate.customerId,
    trigger: "ESTIMATE_APPROVED",
    amount: Number(estimate.totalAmount)
  });
}

