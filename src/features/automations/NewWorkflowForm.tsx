"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const TRIGGERS = [
  "LEAD_CREATED", "CUSTOMER_CREATED", "ESTIMATE_SENT", "ESTIMATE_APPROVED", "CONTRACT_SIGNED",
  "PROJECT_STARTED", "PROJECT_COMPLETED", "INVOICE_SENT", "INVOICE_PAID", "REVIEW_RECEIVED",
  "REFERRAL_RECEIVED", "WARRANTY_EXPIRING", "TASK_OVERDUE", "PROJECT_DELAYED", "INVOICE_OVERDUE"
];
const ACTION_TYPES = ["SEND_EMAIL", "SEND_SMS", "CREATE_TASK", "CREATE_FOLLOWUP", "GENERATE_AI_CONTENT", "NOTIFY_USER", "MOVE_PIPELINE_STAGE", "UPDATE_PROJECT", "DELAY"];
const CONDITION_FIELDS = ["rating", "amount"];

type ActionRow = { type: string; message?: string; subject?: string; title?: string; days?: string; stage?: string; status?: string };
type ConditionRow = { field: string; operator: string; value: string };

export function NewWorkflowForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState("INVOICE_PAID");
  const [conditions, setConditions] = useState<ConditionRow[]>([]);
  const [actions, setActions] = useState<ActionRow[]>([{ type: "SEND_EMAIL" }]);
  const [loading, setLoading] = useState(false);

  function updateAction(i: number, patch: Partial<ActionRow>) {
    setActions((prev) => prev.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
  }
  function updateCondition(i: number, patch: Partial<ConditionRow>) {
    setConditions((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  function buildConfig(a: ActionRow): Record<string, unknown> {
    switch (a.type) {
      case "DELAY":
        return { days: Number(a.days) || 1 };
      case "SEND_EMAIL":
        return { subject: a.subject, message: a.message, heading: a.subject };
      case "SEND_SMS":
        return { message: a.message };
      case "CREATE_TASK":
        return { title: a.title };
      case "CREATE_FOLLOWUP":
        return { notes: a.title, days: Number(a.days) || 3 };
      case "GENERATE_AI_CONTENT":
        return { prompt: a.message };
      case "MOVE_PIPELINE_STAGE":
        return { stage: a.stage };
      case "UPDATE_PROJECT":
        return { status: a.status };
      default:
        return {};
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        trigger,
        conditions: conditions
          .filter((c) => c.field && c.value !== "")
          .map((c) => ({ field: c.field, operator: c.operator, value: Number(c.value) || c.value })),
        actions: actions.map((a) => ({ type: a.type, config: buildConfig(a) }))
      })
    });
    setLoading(false);
    if (res.ok) {
      setOpen(false);
      setName("");
      setConditions([]);
      setActions([{ type: "SEND_EMAIL" }]);
      router.refresh();
    }
  }

  if (!open) {
    return <button className="btn-primary" onClick={() => setOpen(true)}>+ New automation</button>;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setOpen(false)}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="card w-full max-w-xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
        <h2 className="text-white font-medium">New automation</h2>

        <input className="input" placeholder="Name (e.g. 'Ask for a review after payment')" value={name} onChange={(e) => setName(e.target.value)} required />

        <div>
          <label className="block text-xs text-graphite-300 mb-1">Trigger</label>
          <select className="input" value={trigger} onChange={(e) => setTrigger(e.target.value)}>
            {TRIGGERS.map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs text-graphite-300">Conditions (optional)</label>
            <button type="button" className="text-xs text-accent hover:underline" onClick={() => setConditions((p) => [...p, { field: "rating", operator: "gte", value: "" }])}>
              + Add condition
            </button>
          </div>
          {conditions.map((c, i) => (
            <div key={i} className="grid grid-cols-3 gap-2 mb-2">
              <select className="input text-xs" value={c.field} onChange={(e) => updateCondition(i, { field: e.target.value })}>
                {CONDITION_FIELDS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
              <select className="input text-xs" value={c.operator} onChange={(e) => updateCondition(i, { operator: e.target.value })}>
                <option value="gte">≥</option>
                <option value="lte">≤</option>
                <option value="eq">=</option>
                <option value="neq">≠</option>
              </select>
              <input className="input text-xs" placeholder="Value" value={c.value} onChange={(e) => updateCondition(i, { value: e.target.value })} />
            </div>
          ))}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs text-graphite-300">Actions (in order)</label>
            <button type="button" className="text-xs text-accent hover:underline" onClick={() => setActions((p) => [...p, { type: "SEND_EMAIL" }])}>
              + Add action
            </button>
          </div>
          {actions.map((a, i) => (
            <div key={i} className="card p-3 mb-2 space-y-2">
              <select className="input text-xs" value={a.type} onChange={(e) => updateAction(i, { type: e.target.value })}>
                {ACTION_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
              </select>
              {a.type === "DELAY" ? (
                <input className="input text-xs" type="number" placeholder="Days to wait" value={a.days || ""} onChange={(e) => updateAction(i, { days: e.target.value })} />
              ) : a.type === "SEND_EMAIL" ? (
                <>
                  <input className="input text-xs" placeholder="Subject" value={a.subject || ""} onChange={(e) => updateAction(i, { subject: e.target.value })} />
                  <textarea className="input text-xs" placeholder="Message" rows={2} value={a.message || ""} onChange={(e) => updateAction(i, { message: e.target.value })} />
                </>
              ) : a.type === "SEND_SMS" ? (
                <input className="input text-xs" placeholder="Message" value={a.message || ""} onChange={(e) => updateAction(i, { message: e.target.value })} />
              ) : a.type === "CREATE_TASK" ? (
                <input className="input text-xs" placeholder="Task title" value={a.title || ""} onChange={(e) => updateAction(i, { title: e.target.value })} />
              ) : a.type === "CREATE_FOLLOWUP" ? (
                <>
                  <input className="input text-xs" placeholder="Follow-up notes" value={a.title || ""} onChange={(e) => updateAction(i, { title: e.target.value })} />
                  <input className="input text-xs" type="number" placeholder="Days from now" value={a.days || ""} onChange={(e) => updateAction(i, { days: e.target.value })} />
                </>
              ) : a.type === "GENERATE_AI_CONTENT" ? (
                <input className="input text-xs" placeholder="What should it write about?" value={a.message || ""} onChange={(e) => updateAction(i, { message: e.target.value })} />
              ) : a.type === "MOVE_PIPELINE_STAGE" ? (
                <select className="input text-xs" value={a.stage || ""} onChange={(e) => updateAction(i, { stage: e.target.value })}>
                  <option value="">Select stage</option>
                  <option value="NEW_LEAD">New Lead</option>
                  <option value="CONTACTED">Contacted</option>
                  <option value="ESTIMATE_SENT">Estimate Sent</option>
                  <option value="WON">Won</option>
                  <option value="LOST">Lost</option>
                </select>
              ) : a.type === "UPDATE_PROJECT" ? (
                <select className="input text-xs" value={a.status || ""} onChange={(e) => updateAction(i, { status: e.target.value })}>
                  <option value="">Select status</option>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="ON_HOLD">On Hold</option>
                  <option value="COMPLETE">Complete</option>
                </select>
              ) : null}
            </div>
          ))}
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
          <button type="submit" disabled={loading || !name.trim()} className="btn-primary">{loading ? "Saving..." : "Save automation"}</button>
        </div>
      </form>
    </div>
  );
}
