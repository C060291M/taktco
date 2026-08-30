"use client";
import { useState } from "react";
import Link from "next/link";

type JobCard = { id: string; status: string; customerName: string; quotedCost: number };

const STATUSES = [
  { key: "SCHEDULED", label: "Scheduled" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "OTHER", label: "Needs Attention" },
  { key: "COMPLETE", label: "Complete" }
];

// New Phase 4 statuses (materials ordered, on hold, weather delay, etc.) all land
// in the "Needs Attention" bucket on this high-level board rather than a column
// each - the detailed status is still set exactly via the dropdown on the job's
// own page (features/jobs/CrewAndStatus.tsx); this board stays a simple 4-lane
// overview so it doesn't turn into an unreadable 12-column Kanban. A colored
// tag on each card shows the specific sub-status at a glance within the
// "Needs Attention" column instead of hiding it entirely.
function bucketFor(status: string) {
  if (status === "SCHEDULED" || status === "IN_PROGRESS" || status === "COMPLETE") return status;
  if (status === "CLOSED" || status === "ARCHIVED") return "COMPLETE";
  return "OTHER";
}

const TAG_STYLE: Record<string, string> = {
  MATERIALS_ORDERED: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  READY_TO_START: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  INSPECTION_REQUIRED: "bg-purple-500/20 text-purple-300 border-purple-500/40",
  ON_HOLD: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  WAITING_ON_CUSTOMER: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  WEATHER_DELAY: "bg-red-500/20 text-red-300 border-red-500/40",
  PUNCH_LIST: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
};

function JobTag({ status }: { status: string }) {
  const bucket = bucketFor(status);
  if (bucket !== "OTHER") return null;
  const style = TAG_STYLE[status] || "bg-graphite-700 text-graphite-300 border-graphite-600";
  return (
    <span className={"inline-block text-[9px] px-1.5 py-0.5 rounded border mt-1.5 " + style}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function JobsBoard({ initialJobs, hideCost }: { initialJobs: JobCard[]; hideCost?: boolean }) {
  const [jobs, setJobs] = useState(initialJobs);
  const [dragging, setDragging] = useState<string | null>(null);

  async function moveJob(jobId: string, bucketKey: string) {
    const status = bucketKey === "OTHER" ? "ON_HOLD" : bucketKey;
    setJobs(function (prev) {
      return prev.map(function (j) { return j.id === jobId ? { ...j, status } : j; });
    });
    await fetch("/api/jobs/" + jobId, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
  }

  return (
    <div className="grid grid-cols-4 gap-4">
      {STATUSES.map(function (s) {
        const statusJobs = jobs.filter(function (j) { return bucketFor(j.status) === s.key; });
        return (
          <div
            key={s.key}
            className="bg-graphite-900 border border-graphite-700 rounded-xl p-3 min-h-[300px]"
            onDragOver={function (e) { e.preventDefault(); }}
            onDrop={function () { if (dragging) moveJob(dragging, s.key); }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-medium text-graphite-300 uppercase tracking-wide">{s.label}</h3>
              <span className="text-xs text-graphite-500">{statusJobs.length}</span>
            </div>
            <div className="space-y-2">
              {statusJobs.map(function (job) {
                return (
                  <div
                    key={job.id}
                    draggable
                    onDragStart={function () { setDragging(job.id); }}
                    onDragEnd={function () { setDragging(null); }}
                    className="card p-3 cursor-grab active:cursor-grabbing hover:border-accent/50 transition-colors"
                  >
                    <Link href={"/jobs/" + job.id} className="text-sm text-graphite-100 hover:text-accent block">
                      {job.customerName}
                    </Link>
                    {!hideCost && <p className="text-xs text-graphite-400 mt-1">${job.quotedCost.toLocaleString()}</p>}
                    <JobTag status={job.status} />
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

