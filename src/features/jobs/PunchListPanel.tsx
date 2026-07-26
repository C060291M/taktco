"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";

type Item = { id: string; description: string; priority: string; status: string };

export function PunchListPanel({ jobId, items }: { jobId: string; items: Item[] }) {
  const router = useRouter();
  const [desc, setDesc] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [loading, setLoading] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!desc.trim()) return;
    setLoading(true);
    await fetch("/api/punch-list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, description: desc, priority })
    });
    setLoading(false);
    setDesc("");
    router.refresh();
  }

  async function toggle(id: string, done: boolean) {
    await fetch(`/api/punch-list/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: done ? "OPEN" : "DONE" })
    });
    router.refresh();
  }

  return (
    <div className="card p-5">
      <h2 className="text-sm font-medium text-white mb-3">Punch list</h2>
      <form onSubmit={add} className="flex gap-2 mb-4">
        <input className="input" placeholder="What needs fixing?" value={desc} onChange={(e) => setDesc(e.target.value)} />
        <select className="input w-28 shrink-0" value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
        </select>
        <button className="btn-secondary text-xs shrink-0" disabled={loading}>Add</button>
      </form>
      {items.length === 0 ? (
        <p className="text-sm text-graphite-400">Nothing on the punch list.</p>
      ) : (
        <div className="space-y-2">
          {items.map((i) => (
            <div key={i.id} className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={i.status === "DONE"} onChange={() => toggle(i.id, i.status === "DONE")} />
                <span className={i.status === "DONE" ? "line-through text-graphite-500" : "text-graphite-100"}>{i.description}</span>
              </label>
              <Badge color={i.priority === "HIGH" ? "red" : i.priority === "LOW" ? "gray" : "yellow"}>{i.priority}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
