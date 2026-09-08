import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AutomationsList } from "@/features/automations/AutomationsList";
import { NewWorkflowForm } from "@/features/automations/NewWorkflowForm";
import { AutomationTemplates } from "@/features/automations/AutomationTemplates";

export default async function AutomationsPage() {
  const ctx = await requireSession();
  if (!ctx) redirect("/login");

  const workflows = await db.automationWorkflow.findMany({
    where: { companyId: ctx.company.id },
    include: { actions: { orderBy: { order: "asc" } } },
    orderBy: { order: "asc" }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Automations</h1>
          <p className="text-sm text-graphite-400">
            Put your follow-up on autopilot. Automations send emails and texts, create tasks, and update records for you when something happens - a job wraps up, a lead comes in, an invoice gets paid.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <AutomationTemplates existingTriggers={workflows.map(function (w) { return w.trigger; })} />
          <NewWorkflowForm />
        </div>
      </div>

      <AutomationsList
        workflows={workflows.map((w) => ({
          id: w.id,
          name: w.name,
          trigger: w.trigger,
          enabled: w.enabled,
          conditions: w.conditions as { field: string; operator: string; value: unknown }[],
          actions: w.actions.map((a) => ({ id: a.id, type: a.type, config: a.config as Record<string, unknown> }))
        }))}
      />
    </div>
  );
}
