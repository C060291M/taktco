import { db } from "@/database/client";
import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AutomationsList } from "@/features/automations/AutomationsList";
import { NewWorkflowForm } from "@/features/automations/NewWorkflowForm";

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
            Rule-based workflows: trigger → conditions → actions. A visual builder is coming later — this same data will power it.
          </p>
        </div>
        <NewWorkflowForm />
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
