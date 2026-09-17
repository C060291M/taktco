"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export type DeletedItemType = "customer" | "estimate" | "job" | "invoice" | "campaign";

export interface DeletedItem {
  type: DeletedItemType;
  id: string;
  title: string;
  subtitle: string;
  deletedAt: string;
}

const typeLabels: Record<DeletedItemType, string> = {
  customer: "Customer",
  estimate: "Estimate",
  job: "Project",
  invoice: "Invoice",
  campaign: "Campaign"
};

export function DeletedItemsTable({ items }: { items: DeletedItem[] }) {
  const router = useRouter();
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function restore(item: DeletedItem) {
    setRestoringId(item.id);
    setErrors(function (prev) { const next = { ...prev }; delete next[item.id]; return next; });
    try {
      const res = await fetch(`/api/${item.type}s/${item.id}/restore`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setErrors(function (prev) { return { ...prev, [item.id]: data.error || "Restore failed." }; });
        setRestoringId(null);
        return;
      }
      router.refresh();
    } catch {
      setErrors(function (prev) { return { ...prev, [item.id]: "Restore failed. Try again." }; });
      setRestoringId(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="card p-5">
        <p className="text-sm text-graphite-400">Nothing deleted right now.</p>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <div className="space-y-3">
        {items.map(function (item) {
          return (
            <div key={`${item.type}-${item.id}`} className="flex items-center justify-between border-b border-graphite-800 pb-3 last:border-0 last:pb-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wide text-graphite-500">{typeLabels[item.type]}</span>
                  <span className="text-sm font-medium text-white">{item.title}</span>
                </div>
                <p className="text-xs text-graphite-400 mt-0.5">
                  {item.subtitle} Â· Deleted {new Date(item.deletedAt).toLocaleDateString()}
                </p>
                {errors[item.id] && <p className="text-xs text-red-400 mt-1">{errors[item.id]}</p>}
              </div>
              <button
                className="btn-secondary text-xs shrink-0"
                disabled={restoringId === item.id}
                onClick={function () { restore(item); }}
              >
                {restoringId === item.id ? "Restoring..." : "Restore"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}