import { db } from "@/database/client";
import { sendTrackedEmail } from "@/services/resend";
import { sendTrackedSms } from "@/services/twilio";
import { brandedEmail } from "@/emails/brandedEmail";
import { generateWithGateway } from "@/lib/aiGateway";

type TriggerContext = {
  companyId: string;
  customerId?: string;
  jobId?: string;
  invoiceId?: string;
  leadId?: string;
  // Flat, simple fields conditions can check against (e.g. "rating", "amount") -
  // deliberately not deeply nested, so both the condition evaluator and a future
  // visual builder stay simple.
  [key: string]: unknown;
};

type Condition = { field: string; operator: "eq" | "gte" | "lte" | "neq"; value: unknown };

function evaluateConditions(conditions: Condition[], context: TriggerContext): boolean {
  return conditions.every((c) => {
    const actual = context[c.field];
    if (actual === undefined) return false;
    switch (c.operator) {
      case "eq":
        return actual === c.value;
      case "neq":
        return actual !== c.value;
      case "gte":
        return typeof actual === "number" && typeof c.value === "number" && actual >= c.value;
      case "lte":
        return typeof actual === "number" && typeof c.value === "number" && actual <= c.value;
      default:
        return false;
    }
  });
}

// Runs every enabled workflow for a given trigger + company. Called from the
// existing action points in the app (estimate approval, invoice paid, etc.) -
// see the TODO markers at each call site. A future visual builder is just a
// new UI writing to AutomationWorkflow/AutomationAction; this function and the
// schema underneath it don't change.
export async function runTrigger(companyId: string, trigger: string, context: TriggerContext) {
  const workflows = await db.automationWorkflow.findMany({
    where: { companyId, trigger: trigger as never, enabled: true },
    include: { actions: { orderBy: { order: "asc" } } },
    orderBy: { order: "asc" }
  });

  for (const workflow of workflows) {
    const conditions = (workflow.conditions as unknown as Condition[]) || [];
    if (!evaluateConditions(conditions, context)) {
      await db.automationRunLog.create({
        data: { companyId, workflowId: workflow.id, trigger: trigger as never, status: "SKIPPED", summary: "Conditions not met", context: context as never }
      });
      continue;
    }
    await executeActions(workflow.id, companyId, workflow.actions, 0, context);
  }
}

export async function executeActions(
  workflowId: string,
  companyId: string,
  actions: { id: string; order: number; type: string; config: unknown }[],
  fromIndex: number,
  context: TriggerContext
) {
  for (let i = fromIndex; i < actions.length; i++) {
    const action = actions[i];
    const config = (action.config as Record<string, unknown>) || {};

    if (action.type === "DELAY") {
      const days = typeof config.days === "number" ? config.days : 1;
      const runAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      await db.automationScheduledAction.create({
        data: { workflowId, companyId, fromActionIndex: i + 1, context: context as never, runAt }
      });
      return; // stop here - /api/automations/process-scheduled resumes the rest when due
    }

    try {
      await runSingleAction(companyId, action.type, config, context);
    } catch (err) {
      await db.automationRunLog.create({
        data: {
          companyId,
          workflowId,
          trigger: (context.trigger as never) || "LEAD_CREATED",
          status: "FAILED",
          summary: `Action ${action.type} failed: ${err instanceof Error ? err.message : "unknown error"}`,
          context: context as never
        }
      });
      return;
    }
  }

  await db.automationRunLog.create({
    data: { companyId, workflowId, trigger: (context.trigger as never) || "LEAD_CREATED", status: "SUCCESS", summary: "Completed", context: context as never }
  });
}

async function runSingleAction(companyId: string, type: string, config: Record<string, unknown>, context: TriggerContext) {
  const customer = context.customerId ? await db.customer.findUnique({ where: { id: context.customerId } }) : null;
  const company = await db.company.findUnique({ where: { id: companyId } });
  if (!company) return;

  switch (type) {
    case "SEND_EMAIL": {
      if (!customer?.email) return;
      const html = brandedEmail({
        companyName: company.name,
        logoUrl: company.logoUrl,
        accentColor: company.brandAccentColor,
        heading: (config.heading as string) || "A message from " + company.name,
        bodyHtml: (config.message as string) || ""
      });
      await sendTrackedEmail({
        companyId,
        customerId: customer.id,
        toEmail: customer.email,
        subject: (config.subject as string) || company.name,
        html,
        kind: "automation"
      });
      return;
    }
    case "SEND_SMS": {
      if (!customer?.phone) return;
      await sendTrackedSms({
        companyId,
        customerId: customer.id,
        toPhone: customer.phone,
        body: (config.message as string) || `Message from ${company.name}`,
        kind: "automation"
      });
      return;
    }
    case "CREATE_TASK": {
      if (!customer) return;
      await db.task.create({
        data: {
          companyId,
          customerId: customer.id,
          title: (config.title as string) || "Automation task",
          priority: "MEDIUM"
        }
      });
      return;
    }
    case "CREATE_FOLLOWUP": {
      if (!customer) return;
      const days = typeof config.days === "number" ? config.days : 3;
      await db.followUp.create({
        data: {
          companyId,
          customerId: customer.id,
          type: "REMINDER",
          dueDate: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
          notes: (config.notes as string) || "Automated follow-up"
        }
      });
      return;
    }
    case "NOTIFY_USER": {
      // No push/email notification channel exists yet for internal staff -
      // logged to AuditLog so it's at least visible, not silently dropped.
      await db.auditLog.create({
        data: { companyId, action: "automation_notify", entityType: "automation", entityId: "n/a" }
      });
      return;
    }
    case "GENERATE_AI_CONTENT": {
      if (!company) return;
      try {
        const content = await generateWithGateway({
          companyId,
          feature: "marketing_post",
          systemPrompt: `You write marketing content for ${company.name}, a ${company.tradeType || "home service"} business.`,
          userPrompt: (config.prompt as string) || "Write a short customer appreciation post."
        });
        await db.marketingContent.create({
          data: { companyId, platform: "FACEBOOK", prompt: (config.prompt as string) || "", content }
        });
      } catch {
        // AI not configured, out of credits, or failed - swallow so the rest of
        // the workflow chain (already completed by this point) isn't reported
        // as a failure. Real visibility into this lives in AiUsageLog either way.
      }
      return;
    }
    case "ASSIGN_EMPLOYEE": {
      if (!customer || !config.userId) return;
      await db.customer.update({ where: { id: customer.id }, data: { assignedUserId: config.userId as string } });
      return;
    }
    case "MOVE_PIPELINE_STAGE": {
      if (!customer || !config.stage) return;
      await db.lead.updateMany({
        where: { companyId, customerId: customer.id },
        data: { pipelineStage: config.stage as never }
      });
      return;
    }
    case "UPDATE_PROJECT": {
      if (!context.jobId || !config.status) return;
      await db.job.update({
        where: { id: context.jobId as string },
        data: { status: config.status as never }
      });
      return;
    }
    default:
      return;
  }
}
