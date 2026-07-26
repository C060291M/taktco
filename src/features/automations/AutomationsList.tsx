"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";

type Action = { id: string; type: string; config: Record<string, unknown> };
type Workflow = {
  id: string;
  name: string;
  trigger: string;
  enabled: boolean;
  conditions: { field: string; operator: string; value: unknown }[];
  actions: Action[];
};

const ACTION_LABEL: Record<string, string> = {
  SEND_EMAIL: "Send email",
  SEND_SMS: "Send SMS",
  CREATE_TASK: "Create task",
  CREATE_FOLLOWUP: "Create follow-up",
  ASSIGN_EMPLOYEE: "Assign employee",
  GENERATE_AI_CONTENT: "Generate AI content",
  NOTIFY_USER: "Notify user",
  MOVE_PIPELINE_STAGE: "Move pipeline stage",
  UPDATE_PROJECT: "Update project",
  DELAY: "Wait"
};

export function AutomationsList({ workflows }: { workflows: Workflow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, string>>({});

  async function toggle(id: string, enabled: boolean) {
    setBusyId(id);
    await fetch(`/api/automations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !enabled })
    });
    setBusyId(null);
    router.refresh();
  }

  async function duplicate(id: string) {
    setBusyId(id);
    await fetch(`/api/automations/${id}/duplicate`, { method: "POST" });
    setBusyId(null);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Delete this workflow?")) return;
    setBusyId(id);
    await fetch(`/api/automations/${id}`, { method: "DELETE" });
    setBusyId(null);
    router.refresh();
  }

  async function test(id: string) {
    setBusyId(id);
    const res = await fetch(`/api/automations/${id}/test`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    setTestResult((prev) => ({ ...prev, [id]: res.ok ? `Ran against ${data.testedAgainst}` : data.error || "Test failed" }));
  }

  async function reorder(id: string, direction: "up" | "down") {
    const index = workflows.findIndex((w) => w.id === id);
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= workflows.length) return;
    setBusyId(id);
    await Promise.all([
      fetch(`/api/automations/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order: swapWith }) }),
      fetch(`/api/automations/${workflows[swapWith].id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order: index }) })
    ]);
    setBusyId(null);
    router.refresh();
  }

  if (workflows.length === 0) {
    return <div className="card p-8 text-center text-sm text-graphite-400">No automations yet. Create your first one above.</div>;
  }

  return (
    <div className="space-y-3">
      {workflows.map((w, i) => (
        <div key={w.id} className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-white font-medium">{w.name}</p>
                <Badge color={w.enabled ? "green" : "gray"}>{w.enabled ? "Enabled" : "Disabled"}</Badge>
              </div>
              <p className="text-xs text-graphite-400 mt-1">
                {w.trigger.replace(/_/g, " ")}
                {w.conditions.length > 0 && ` · ${w.conditions.length} condition${w.conditions.length === 1 ? "" : "s"}`}
                {" · "}
                {w.actions.map((a) => ACTION_LABEL[a.type] || a.type).join(" → ")}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button className="text-xs text-graphite-400 hover:text-white px-1" disabled={busyId === w.id || i === 0} onClick={() => reorder(w.id, "up")}>↑</button>
              <button className="text-xs text-graphite-400 hover:text-white px-1" disabled={busyId === w.id || i === workflows.length - 1} onClick={() => reorder(w.id, "down")}>↓</button>
              <button className="btn-secondary text-xs" disabled={busyId === w.id} onClick={() => test(w.id)}>Test</button>
              <button className="btn-secondary text-xs" disabled={busyId === w.id} onClick={() => toggle(w.id, w.enabled)}>{w.enabled ? "Disable" : "Enable"}</button>
              <button className="btn-secondary text-xs" disabled={busyId === w.id} onClick={() => duplicate(w.id)}>Duplicate</button>
              <button className="text-xs text-graphite-400 hover:text-red-400 px-2" disabled={busyId === w.id} onClick={() => remove(w.id)}>Delete</button>
            </div>
          </div>
          {testResult[w.id] && <p className="text-xs text-accent mt-2">{testResult[w.id]}</p>}
        </div>
      ))}
    </div>
  );
}
