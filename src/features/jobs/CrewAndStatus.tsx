"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUSES = [
  "SCHEDULED", "MATERIALS_ORDERED", "READY_TO_START", "IN_PROGRESS", "INSPECTION_REQUIRED",
  "ON_HOLD", "WAITING_ON_CUSTOMER", "WEATHER_DELAY", "PUNCH_LIST", "COMPLETE", "CLOSED", "ARCHIVED"
];

type TeamMember = { id: string; name: string };

export function CrewAndStatus({
  jobId,
  status,
  assignedUserIds,
  teamMembers,
  startDate: initialStartDate,
  endDate: initialEndDate
}: {
  jobId: string;
  status: string;
  assignedUserIds: string[];
  teamMembers: TeamMember[];
  startDate?: string | null;
  endDate?: string | null;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [startDate, setStartDate] = useState(initialStartDate ? initialStartDate.slice(0, 10) : "");
  const [endDate, setEndDate] = useState(initialEndDate ? initialEndDate.slice(0, 10) : "");

  async function patch(body: object) {
    setSaving(true);
    await fetch(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    setSaving(false);
    router.refresh();
  }

  function toggleCrew(userId: string) {
    const next = assignedUserIds.includes(userId)
      ? assignedUserIds.filter((id) => id !== userId)
      : [...assignedUserIds, userId];
    patch({ assignedUserIds: next });
  }

  return (
    <div className="card p-5 space-y-4">
      {status !== "COMPLETE" && status !== "CLOSED" && status !== "ARCHIVED" && (
        <button
          type="button"
          className="btn-primary w-full"
          disabled={saving}
          onClick={() => {
            if (confirm("Mark this project as complete? This also marks the customer as completed.")) {
              patch({ status: "COMPLETE" });
            }
          }}
        >
          Mark Project Complete
        </button>
      )}
      <div className="grid md:grid-cols-2 gap-4">
      <div>
        <p className="text-xs text-graphite-400 mb-1">Status</p>
        <select className="input" value={status} disabled={saving} onChange={(e) => patch({ status: e.target.value })}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>
      </div>
      <div>
        <p className="text-xs text-graphite-400 mb-1">Start date</p>
        <input
          className="input"
          type="date"
          value={startDate}
          disabled={saving}
          onChange={(e) => {
            setStartDate(e.target.value);
            patch({ startDate: e.target.value || null });
          }}
        />
      </div>
      <div>
        <p className="text-xs text-graphite-400 mb-1">End date (optional)</p>
        <input
          className="input"
          type="date"
          value={endDate}
          disabled={saving}
          onChange={(e) => {
            setEndDate(e.target.value);
            patch({ endDate: e.target.value || null });
          }}
        />
      </div>
      <div>
        <p className="text-xs text-graphite-400 mb-1">Crew assigned</p>
        <div className="flex flex-wrap gap-2">
          {teamMembers.map((m) => (
            <button
              key={m.id}
              type="button"
              disabled={saving}
              onClick={() => toggleCrew(m.id)}
              className={`text-xs px-2 py-1 rounded-md border ${
                assignedUserIds.includes(m.id) ? "bg-accent/20 border-accent text-accent" : "border-graphite-600 text-graphite-300"
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
}


