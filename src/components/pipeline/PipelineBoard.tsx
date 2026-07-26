"use client";
import { useState } from "react";
import Link from "next/link";

type Lead = {
  id: string;
  pipelineStage: string;
  customerName: string;
  customerId: string;
  notes: string | null;
};

const STAGES = [
  { key: "NEW_LEAD", label: "New Lead" },
  { key: "CONTACTED", label: "Contacted" },
  { key: "ESTIMATE_SENT", label: "Estimate Sent" },
  { key: "WON", label: "Won" },
  { key: "LOST", label: "Lost" }
];

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
    <div className="grid grid-cols-5 gap-4">
      {STAGES.map((stage) => {
        const stageLeads = leads.filter((l) => l.pipelineStage === stage.key);
        return (
          <div
            key={stage.key}
            className="bg-graphite-900 border border-graphite-700 rounded-xl p-3 min-h-[300px]"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => dragging && moveLead(dragging, stage.key)}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-medium text-graphite-300 uppercase tracking-wide">{stage.label}</h3>
              <span className="text-xs text-graphite-500">{stageLeads.length}</span>
            </div>
            <div className="space-y-2">
              {stageLeads.map((lead) => (
                <div
                  key={lead.id}
                  draggable
                  onDragStart={() => setDragging(lead.id)}
                  onDragEnd={() => setDragging(null)}
                  className="card p-3 cursor-grab active:cursor-grabbing hover:border-accent/50 transition-colors"
                >
                  <Link href={`/customers/${lead.customerId}`} className="text-sm text-graphite-100 hover:text-accent block">
                    {lead.customerName}
                  </Link>
                  {lead.notes && <p className="text-xs text-graphite-400 mt-1 line-clamp-2">{lead.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
