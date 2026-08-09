"use client";
import { useState } from "react";
import Link from "next/link";

type JobEvent = {
  id: string;
  customerName: string;
  status: string;
  startDate: string;
  endDate: string;
  projectAddress: string | null;
};

function statusColor(status: string) {
  if (status === "COMPLETE" || status === "CLOSED") return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
  if (status === "ON_HOLD" || status === "WEATHER_DELAY" || status === "WAITING_ON_CUSTOMER") return "bg-amber-500/20 text-amber-300 border-amber-500/40";
  if (status === "IN_PROGRESS") return "bg-accent/20 text-accent border-accent/40";
  return "bg-graphite-700 text-graphite-200 border-graphite-600";
}

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function ScheduleCalendar({ events }: { events: JobEvent[] }) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const eventsByDay = new Map<string, JobEvent[]>();
  for (const ev of events) {
    const start = new Date(ev.startDate);
    const end = new Date(ev.endDate);
    const cursorDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    while (cursorDate <= endDate) {
      const key = toDateKey(cursorDate);
      if (!eventsByDay.has(key)) eventsByDay.set(key, []);
      eventsByDay.get(key)!.push(ev);
      cursorDate.setDate(cursorDate.getDate() + 1);
    }
  }

  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const today = toDateKey(new Date());

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-medium">{monthLabel}</h2>
        <div className="flex gap-2">
          <button className="btn-secondary text-xs" onClick={() => setCursor(new Date(year, month - 1, 1))}>Prev</button>
          <button className="btn-secondary text-xs" onClick={() => setCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>Today</button>
          <button className="btn-secondary text-xs" onClick={() => setCursor(new Date(year, month + 1, 1))}>Next</button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-graphite-500 mb-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d}>{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <div key={i} className="min-h-[90px] rounded-lg bg-graphite-900/40" />;
          const key = toDateKey(date);
          const dayEvents = eventsByDay.get(key) || [];
          const isToday = key === today;
          return (
            <div
              key={i}
              className={`min-h-[90px] rounded-lg border p-1.5 space-y-1 ${isToday ? "border-accent" : "border-graphite-700"}`}
            >
              <p className={`text-[11px] ${isToday ? "text-accent font-semibold" : "text-graphite-500"}`}>{date.getDate()}</p>
              {dayEvents.slice(0, 3).map((ev) => (
                <Link
                  key={ev.id}
                  href={`/jobs/${ev.id}`}
                  className={`block text-[10px] px-1.5 py-0.5 rounded border truncate ${statusColor(ev.status)}`}
                  title={`${ev.customerName}${ev.projectAddress ? " - " + ev.projectAddress : ""}`}
                >
                  {ev.customerName}
                </Link>
              ))}
              {dayEvents.length > 3 && (
                <p className="text-[10px] text-graphite-500 px-1.5">+{dayEvents.length - 3} more</p>
              )}
            </div>
          );
        })}
      </div>

      {events.length === 0 && (
        <p className="text-sm text-graphite-500 text-center py-6">No projects have a start date scheduled yet.</p>
      )}
    </div>
  );
}
