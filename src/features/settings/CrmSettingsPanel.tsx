"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/useToast";

type Item = { id: string; name: string; color?: string };

export function CrmSettingsPanel({ tags, leadSources }: { tags: Item[]; leadSources: Item[] }) {
  const router = useRouter();
  const toast = useToast();
  const [tagName, setTagName] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [saving, setSaving] = useState(false);

  async function addTag(e: React.FormEvent) {
    e.preventDefault();
    if (!tagName.trim()) return;
    setSaving(true);
    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: tagName })
    });
    setSaving(false);
    if (res.ok) {
      setTagName("");
      toast.success("Tag added");
      router.refresh();
    } else {
      toast.error("Couldn't add that tag");
    }
  }

  async function addSource(e: React.FormEvent) {
    e.preventDefault();
    if (!sourceName.trim()) return;
    setSaving(true);
    const res = await fetch("/api/lead-sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: sourceName })
    });
    setSaving(false);
    if (res.ok) {
      setSourceName("");
      toast.success("Lead source added");
      router.refresh();
    } else {
      toast.error("Couldn't add that source");
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-5">
      <div className="card p-5">
        <h2 className="text-sm font-medium text-white mb-3">Customer tags</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {tags.length === 0 && <p className="text-sm text-graphite-400">No tags yet.</p>}
          {tags.map((t) => (
            <span
              key={t.id}
              className="text-xs px-2 py-1 rounded-md"
              style={{ backgroundColor: `${t.color}22`, color: t.color }}
            >
              {t.name}
            </span>
          ))}
        </div>
        <form onSubmit={addTag} className="flex gap-2">
          <input className="input" placeholder="New tag name" value={tagName} onChange={(e) => setTagName(e.target.value)} />
          <button className="btn-secondary shrink-0" disabled={saving}>Add</button>
        </form>
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-medium text-white mb-3">Lead sources</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {leadSources.length === 0 && <p className="text-sm text-graphite-400">No lead sources yet.</p>}
          {leadSources.map((s) => (
            <span key={s.id} className="text-xs px-2 py-1 rounded-md bg-graphite-700 text-graphite-200">
              {s.name}
            </span>
          ))}
        </div>
        <form onSubmit={addSource} className="flex gap-2">
          <input className="input" placeholder="New source name" value={sourceName} onChange={(e) => setSourceName(e.target.value)} />
          <button className="btn-secondary shrink-0" disabled={saving}>Add</button>
        </form>
      </div>

      <div className="card p-5 md:col-span-2">
        <h2 className="text-sm font-medium text-white mb-1">Salespeople</h2>
        <p className="text-xs text-graphite-400">
          Anyone added under Settings → Team with the Sales Rep role can be assigned to leads and customers automatically — no separate list to manage here.
        </p>
      </div>
    </div>
  );
}
