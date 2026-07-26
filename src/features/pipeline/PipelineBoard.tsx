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

  async function moveLead(leadId: string, stage: string) {
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, pipelineStage: stage } : l)));
    await fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId, pipelineStage: stage })
    });
  }

  return (
    <div className="grid grid-cols-9 gap-3 overflow-x-auto">
      {STAGES.map((stage) => {
        const stageLeads = leads.filter((l) => l.pipelineStage === stage.key);
        return (
          <div
            key={stage.key}
            className="bg-graphite-900 border border-graphite-700 rounded-xl p-2.5 min-h-[300px] min-w-[150px]"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => dragging && moveLead(dragging, stage.key)}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] font-medium text-graphite-300 uppercase tracking-wide">{stage.label}</h3>
              <span className="text-[11px] text-graphite-500">{stageLeads.length}</span>
            </div>
            <div className="space-y-2">
              {stageLeads.map((lead) => (
                <div
                  key={lead.id}
                  draggable
                  onDragStart={() => setDragging(lead.id)}
                  onDragEnd={() => setDragging(null)}
                  className="card p-2.5 cursor-grab active:cursor-grabbing hover:border-accent/50 transition-colors relative"
                >
                  <div
                    className="absolute left-0 top-2 bottom-2 w-0.5 rounded"
                    style={{ backgroundColor: PRIORITY_COLOR[lead.priority] || PRIORITY_COLOR.MEDIUM }}
                  />
                  <Link href={`/pipeline/${lead.id}`} className="text-sm text-graphite-100 hover:text-accent block pl-1.5">
                    {lead.customerName}
                  </Link>
                  {lead.notes && <p className="text-xs text-graphite-400 mt-1 line-clamp-2 pl-1.5">{lead.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
