"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Tag = { id: string; name: string; color: string };

export function CustomerTagPicker({ customerId, allTags, activeTagIds }: { customerId: string; allTags: Tag[]; activeTagIds: string[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [newTagName, setNewTagName] = useState("");

  async function toggle(tagId: string, active: boolean) {
    setBusy(true);
    await fetch(`/api/customers/${customerId}/tags`, {
      method: active ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagId })
    });
    setBusy(false);
    router.refresh();
  }

  async function createAndAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newTagName.trim()) return;
    setBusy(true);
    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newTagName.trim() })
    });
    const tag = await res.json();
    await fetch(`/api/customers/${customerId}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagId: tag.id })
    });
    setNewTagName("");
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {allTags.map((tag) => {
        const active = activeTagIds.includes(tag.id);
        return (
          <button
            key={tag.id}
            disabled={busy}
            onClick={() => toggle(tag.id, active)}
            className="px-2 py-0.5 rounded text-xs font-medium border transition-opacity"
            style={{
              backgroundColor: active ? `${tag.color}33` : "transparent",
              borderColor: tag.color,
              color: tag.color,
              opacity: active ? 1 : 0.5
            }}
          >
            {tag.name}
          </button>
        );
      })}
      <form onSubmit={createAndAdd} className="inline-flex items-center gap-1">
        <input
          className="input py-0.5 px-2 text-xs w-24"
          placeholder="+ tag"
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
        />
      </form>
    </div>
  );
}
