"use client";
import { useState } from "react";
import Link from "next/link";

type Lead = {
  id: string;
  pipelineStage: string;
  customerName: string;
  customerId: string;
  notes: string | null;
  priority: string;
};

const STAGES = [
  { key: "NEW_LEAD", label: "New" },
  { key: "CONTACTED", label: "Contacted" },
  { key: "APPOINTMENT_SCHEDULED", label: "Appointment" },
  { key: "ESTIMATE_REQUESTED", label: "Est. Requested" },
  { key: "ESTIMATE_SENT", label: "Est. Sent" },
  { key: "NEGOTIATION", label: "Negotiation" },
  { key: "WON", label: "Won" },
  { key: "LOST", label: "Lost" },
  { key: "ARCHIVED", label: "Archived" }
];

const PRIORITY_COLOR: Record<string, string> = { HIGH: "#EF4444", MEDIUM: "#F59E0B", LOW: "#8A8F98" };

export function PipelineBoard({ initialLeads }: { initialLeads: Lead[] }) {
  const [leads, setLeads] = useState(initialLeads);
  const [dragging, setDragging] = useState<string | null>(null);
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const [scheduledIds, setScheduledIds] = useState<Record<string, boolean>>({});

  async function moveLead(leadId: string, stage: string) {
    setLeads(function (prev) {
      return prev.map(function (l) { return l.id === leadId ? { ...l, pipelineStage: stage } : l; });
    });
    await fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId, pipelineStage: stage })
    });
  }

  async function scheduleFollowUp(lead: Lead, dueDate: string) {
    if (!dueDate) return;
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId: lead.id,
        customerId: lead.customerId,
        title: "Follow up with " + lead.customerName,
        dueDate: dueDate
      })
    });
    setSchedulingId(null);
    setScheduledIds(function (prev) { return { ...prev, [lead.id]: true }; });
  }

  return (
    <div className="grid grid-cols-9 gap-3 overflow-x-auto">
      {STAGES.map(function (stage) {
        const stageLeads = leads.filter(function (l) { return l.pipelineStage === stage.key; });
        return (
          <div
            key={stage.key}
            className="bg-graphite-900 border border-graphite-700 rounded-xl p-2.5 min-h-[300px] min-w-[150px]"
            onDragOver={function (e) { e.preventDefault(); }}
            onDrop={function () { if (dragging) moveLead(dragging, stage.key); }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] font-medium text-graphite-300 uppercase tracking-wide">{stage.label}</h3>
              <span className="text-[11px] text-graphite-500">{stageLeads.length}</span>
            </div>
            <div className="space-y-2">
              {stageLeads.map(function (lead) {
                return (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={function () { setDragging(lead.id); }}
                    onDragEnd={function () { setDragging(null); }}
                    className="card p-2.5 cursor-grab active:cursor-grabbing hover:border-accent/50 transition-colors relative"
                  >
                    <div
                      className="absolute left-0 top-2 bottom-2 w-0.5 rounded"
                      style={{ backgroundColor: PRIORITY_COLOR[lead.priority] || PRIORITY_COLOR.MEDIUM }}
                    />
                    <div className="flex items-center justify-between pl-1.5">
                      <Link href={"/pipeline/" + lead.id} className="text-sm text-graphite-100 hover:text-accent block">
                        {lead.customerName}
                      </Link>
                      <button
                        type="button"
                        className={"text-[11px] shrink-0 " + (scheduledIds[lead.id] ? "text-emerald-400" : "text-graphite-500 hover:text-accent")}
                        title="Schedule a follow-up"
                        onClick={function (e) { e.stopPropagation(); setSchedulingId(schedulingId === lead.id ? null : lead.id); }}
                      >
                        {scheduledIds[lead.id] ? "\u2713" : "\uD83D\uDCC5"}
                      </button>
                    </div>
                    {lead.notes && <p className="text-xs text-graphite-400 mt-1 line-clamp-2 pl-1.5">{lead.notes}</p>}
                    {schedulingId === lead.id && (
                      <input
                        type="date"
                        autoFocus
                        className="input text-[11px] mt-2 py-1"
                        onClick={function (e) { e.stopPropagation(); }}
                        onChange={function (e) { scheduleFollowUp(lead, e.target.value); }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
