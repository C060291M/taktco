"use client";
import { useState } from "react";
import Link from "next/link";

type JobCard = { id: string; status: string; customerName: string; quotedCost: number };

const STATUSES = [
  { key: "SCHEDULED", label: "Scheduled" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "COMPLETE", label: "Complete" }
];

export function JobsBoard({ initialJobs }: { initialJobs: JobCard[] }) {
  const [jobs, setJobs] = useState(initialJobs);
  const [dragging, setDragging] = useState<string | null>(null);

  async function moveJob(jobId: string, status: string) {
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status } : j)));
    await fetch(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {STATUSES.map((s) => {
        const statusJobs = jobs.filter((j) => j.status === s.key);
        return (
          <div
            key={s.key}
            className="bg-graphite-900 border border-graphite-700 rounded-xl p-3 min-h-[300px]"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => dragging && moveJob(dragging, s.key)}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-medium text-graphite-300 uppercase tracking-wide">{s.label}</h3>
              <span className="text-xs text-graphite-500">{statusJobs.length}</span>
            </div>
            <div className="space-y-2">
              {statusJobs.map((job) => (
                <div
                  key={job.id}
                  draggable
                  onDragStart={() => setDragging(job.id)}
                  onDragEnd={() => setDragging(null)}
                  className="card p-3 cursor-grab active:cursor-grabbing hover:border-accent/50 transition-colors"
                >
                  <Link href={`/jobs/${job.id}`} className="text-sm text-graphite-100 hover:text-accent block">
                    {job.customerName}
                  </Link>
                  <p className="text-xs text-graphite-400 mt-1">${job.quotedCost.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
