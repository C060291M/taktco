"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Item = { key: string; label: string; done: boolean; linkUrl: string };

export function OnboardingChecklist() {
  const router = useRouter();
  const [items, setItems] = useState<Item[] | null>(null);
  const [total, setTotal] = useState(0);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    fetch("/api/onboarding-checklist")
      .then((r) => r.json())
      .then((data) => {
        setItems(data.items);
        setTotal(data.total);
      });
  }, []);

  if (!items || hidden) return null;
  const completedCount = items.filter((i) => i.done).length;
  if (completedCount === total) return null; // naturally disappears once done - no dismissal needed

  const percent = Math.round((completedCount / total) * 100);

  return (
    <div className="card p-5 border-accent/30">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-medium text-white">Get your business set up</h2>
          <p className="text-xs text-graphite-400">{completedCount} of {total} complete</p>
        </div>
        <button className="text-xs text-graphite-500 hover:text-white" onClick={() => setHidden(true)}>Hide for now</button>
      </div>
      <div className="h-1.5 bg-graphite-700 rounded-full overflow-hidden mb-3">
        <div className="h-full bg-accent transition-all" style={{ width: `${percent}%` }} />
      </div>
      <div className="grid sm:grid-cols-2 gap-1.5">
        {items.map((item) => (
          <button
            key={item.key}
            onClick={() => !item.done && router.push(item.linkUrl)}
            disabled={item.done}
            className={`flex items-center gap-2 text-left text-xs px-2 py-1.5 rounded ${
              item.done ? "text-graphite-500" : "text-graphite-200 hover:bg-graphite-800"
            }`}
          >
            <span>{item.done ? "✔" : "○"}</span>
            <span className={item.done ? "line-through" : ""}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
