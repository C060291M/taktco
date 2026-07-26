"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

function toDateInputValue(d: Date | string | null) {
  if (!d) return "";
  const date = new Date(d);
  return date.toISOString().slice(0, 10);
}

// Compares calendar dates only (YYYY-MM-DD), both derived via toISOString, so we're
// never comparing a UTC-midnight timestamp against a local-midnight one - that mismatch
// was causing "today" to show as overdue for anyone west of UTC.
function followupState(nextFollowupAt: Date | string | null): "none" | "today" | "overdue" | "upcoming" {
  if (!nextFollowupAt) return "none";
  const followupDate = new Date(nextFollowupAt).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  if (followupDate === today) return "today";
  if (followupDate < today) return "overdue";
  return "upcoming";
}

export function FollowUpControl({ leadId, nextFollowupAt }: { leadId: string; nextFollowupAt: Date | string | null }) {
  const router = useRouter();
  const [value, setValue] = useState(toDateInputValue(nextFollowupAt));
  const [saving, setSaving] = useState(false);

  const state = followupState(nextFollowupAt);
  const isOverdue = state === "overdue";
  const isDueToday = state === "today";

  async function save(newValue: string) {
    setSaving(true);
    setValue(newValue);
    await fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId, nextFollowupAt: newValue || null })
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <div className={`card p-4 flex items-center justify-between ${isOverdue ? "border-amber-500/40 bg-amber-500/5" : ""}`}>
      <div>
        <p className="text-sm text-white font-medium">Next follow-up</p>
        <p className="text-xs text-graphite-400">
          {isOverdue ? "Overdue" : isDueToday ? "Due today" : "Set a date to get reminded on the dashboard"}
        </p>
      </div>
      <input
        type="date"
        className="input w-40"
        value={value}
        disabled={saving}
        onChange={(e) => save(e.target.value)}
      />
    </div>
  );
}
