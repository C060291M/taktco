import { db } from "@/database/client";

// Ordered pipeline stages - used only to compare "how far along" a lead is,
// so an automated trigger can move a lead forward without ever regressing
// one that's already further along (e.g. a task created for a lead already
// in NEGOTIATION shouldn't snap it back to APPOINTMENT_SCHEDULED).
const STAGE_ORDER = [
  "NEW_LEAD",
  "CONTACTED",
  "APPOINTMENT_SCHEDULED",
  "ESTIMATE_REQUESTED",
  "ESTIMATE_SENT",
  "NEGOTIATION",
  "WON",
  "LOST",
  "ARCHIVED"
];

// Once a lead is closed (won, lost, or archived), no automated trigger should
// ever change its stage again - only a human action should reopen it.
const TERMINAL = ["WON", "LOST", "ARCHIVED"];

// wonAt/lostAt get stamped the moment a lead transitions INTO that stage -
// this is the only reliable record of WHEN a deal actually closed, since
// Lead has no general updatedAt field. Used by the Monthly/Yearly Business
// Review to accurately report "leads won/lost this period".
function stageTimestampData(targetStage: string): Record<string, unknown> {
  if (targetStage === "WON") return { pipelineStage: "WON", wonAt: new Date() };
  if (targetStage === "LOST") return { pipelineStage: "LOST", lostAt: new Date() };
  return { pipelineStage: targetStage };
}

async function bumpLeads(leads: { id: string; pipelineStage: string }[], targetStage: string) {
  const targetIndex = STAGE_ORDER.indexOf(targetStage);
  for (const lead of leads) {
    const currentIndex = STAGE_ORDER.indexOf(lead.pipelineStage);
    if (currentIndex < targetIndex) {
      await db.lead.update({ where: { id: lead.id }, data: stageTimestampData(targetStage) as never });
    }
  }
}

// For triggers that only know a customerId (e.g. an estimate belongs to a
// customer, not directly to a lead) - bumps every non-closed lead for that
// customer.
export async function bumpLeadStageForCustomer(companyId: string, customerId: string, targetStage: string) {
  const leads = await db.lead.findMany({
    where: { companyId, customerId, pipelineStage: { notIn: TERMINAL as never } }
  });
  await bumpLeads(leads, targetStage);
}

// For triggers that know the exact leadId (e.g. a task created directly
// against a lead).
export async function bumpLeadStageById(leadId: string, targetStage: string) {
  const lead = await db.lead.findUnique({ where: { id: leadId } });
  if (!lead || TERMINAL.includes(lead.pipelineStage)) return;
  await bumpLeads([lead], targetStage);
}
