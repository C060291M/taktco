"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AgendaItem } from "@/app/api/agenda/route";

export function TodaysAgenda() {
  const router = useRouter();
  const [items, setItems] = useState<AgendaItem[] | null>(null);

  useEffect(() => {
    fetch("/api/agenda")
      .then((r) => r.json())
      .then((data) => setItems(data.items));
  }, []);

  if (items === null) return null;

  if (items.length === 0) {
    return (
      <div className="card p-5 border-emerald-500/30 bg-emerald-500/5">
        <p className="text-sm text-emerald-300">✓ Nothing urgent today — you're caught up.</p>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <h2 className="text-sm font-medium text-white mb-3">Today's agenda</h2>
      <div className="grid sm:grid-cols-2 gap-2">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => router.push(item.linkUrl)}
            className={`flex items-center justify-between text-left px-3 py-2 rounded-lg border transition-colors ${
              item.urgent ? "border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10" : "border-graphite-700 hover:bg-graphite-800"
            }`}
          >
            <span className="text-sm text-graphite-100 flex items-center gap-2">
              <span>{item.icon}</span>
              {item.label}
            </span>
            <span className={`text-sm font-semibold ${item.urgent ? "text-amber-300" : "text-graphite-300"}`}>{item.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
