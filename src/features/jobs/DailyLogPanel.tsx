"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Log = {
  id: string;
  date: string;
  weather: string | null;
  workCompleted: string | null;
  issues: string | null;
  author: { name: string } | null;
};

export function DailyLogPanel({ jobId, logs }: { jobId: string; logs: Log[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ weather: "", crewPresent: "", hoursWorked: "", workCompleted: "", issues: "", safetyNotes: "" });
  const [loading, setLoading] = useState(false);

  function update(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.workCompleted.trim()) return;
    setLoading(true);
    await fetch("/api/daily-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, ...form, hoursWorked: form.hoursWorked ? Number(form.hoursWorked) : undefined })
    });
    setLoading(false);
    setOpen(false);
    setForm({ weather: "", crewPresent: "", hoursWorked: "", workCompleted: "", issues: "", safetyNotes: "" });
    router.refresh();
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-white">Daily logs</h2>
        <button className="btn-secondary text-xs" onClick={() => setOpen((o) => !o)}>+ Add today's log</button>
      </div>
      {open && (
        <form onSubmit={submit} className="space-y-2 mb-4 border-b border-graphite-700 pb-4">
          <div className="grid grid-cols-3 gap-2">
            <input className="input text-xs" placeholder="Weather" value={form.weather} onChange={(e) => update("weather", e.target.value)} />
            <input className="input text-xs" placeholder="Crew present" value={form.crewPresent} onChange={(e) => update("crewPresent", e.target.value)} />
            <input className="input text-xs" placeholder="Hours worked" type="number" value={form.hoursWorked} onChange={(e) => update("hoursWorked", e.target.value)} />
          </div>
          <textarea className="input text-xs" placeholder="Work completed today" rows={2} value={form.workCompleted} onChange={(e) => update("workCompleted", e.target.value)} />
          <input className="input text-xs" placeholder="Issues / delays (optional)" value={form.issues} onChange={(e) => update("issues", e.target.value)} />
          <input className="input text-xs" placeholder="Safety notes (optional)" value={form.safetyNotes} onChange={(e) => update("safetyNotes", e.target.value)} />
          <button className="btn-primary text-xs w-full" disabled={loading}>{loading ? "Saving..." : "Save log"}</button>
        </form>
      )}
      {logs.length === 0 ? (
        <p className="text-sm text-graphite-400">No daily logs yet.</p>
      ) : (
        <div className="space-y-3">
          {logs.map((l) => (
            <div key={l.id} className="text-sm border-b border-graphite-700 last:border-0 pb-2 last:pb-0">
              <p className="text-xs text-graphite-400">{new Date(l.date).toLocaleDateString()} {l.weather && `· ${l.weather}`} {l.author && `· ${l.author.name}`}</p>
              <p className="text-graphite-100 mt-1">{l.workCompleted}</p>
              {l.issues && <p className="text-amber-400 text-xs mt-1">⚠ {l.issues}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
