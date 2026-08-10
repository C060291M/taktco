"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function ContractContentEditor({
  contractId,
  content,
  canEdit
}: {
  contractId: string;
  content: string | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content || "");
  const [saving, setSaving] = useState(false);

  const [aiMode, setAiMode] = useState(false);
  const [aiDescription, setAiDescription] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  async function save(newContent: string) {
    setSaving(true);
    await fetch(`/api/contracts/${contractId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newContent })
    });
    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  async function generateWithAi() {
    if (!aiDescription.trim()) return;
    setAiLoading(true);
    setAiError(null);
    const res = await fetch("/api/contracts/ai-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: aiDescription, contractType: "SERVICE_AGREEMENT" })
    });
    const data = await res.json().catch(() => ({}));
    setAiLoading(false);
    if (res.ok) {
      setDraft(data.content);
      setAiMode(false);
      setEditing(true);
    } else if (data.error === "INSUFFICIENT_CREDITS") {
      setAiError("Not enough AI credits for this. Check Settings -> TAKTCO AI.");
    } else {
      setAiError(data.error || "Couldn't generate contract.");
    }
  }

  if (!canEdit) {
    return (
      <pre className="whitespace-pre-wrap font-mono text-xs text-graphite-200 bg-graphite-900 rounded-lg p-4 leading-relaxed">
        {content}
      </pre>
    );
  }

  if (aiMode) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-graphite-400">Describe the job - AI drafts a full contract you can review and edit before saving. This replaces the current content.</p>
        <textarea
          className="input"
          rows={3}
          value={aiDescription}
          onChange={(e) => setAiDescription(e.target.value)}
          placeholder="e.g. Replace 150ft of wood privacy fence with cedar pickets, 2 gates included."
        />
        {aiError && <p className="text-xs text-red-400">{aiError}</p>}
        <div className="flex gap-2 justify-end">
          <button className="btn-secondary text-xs" onClick={() => setAiMode(false)}>Cancel</button>
          <button className="btn-primary text-xs" disabled={aiLoading || !aiDescription.trim()} onClick={generateWithAi}>
            {aiLoading ? "Generating..." : "Generate"}
          </button>
        </div>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="space-y-2">
        <textarea
          className="input w-full font-mono text-xs"
          rows={20}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <div className="flex gap-2 justify-end">
          <button className="btn-secondary text-xs" onClick={() => { setEditing(false); setDraft(content || ""); }}>Cancel</button>
          <button className="btn-primary text-xs" disabled={saving} onClick={() => save(draft)}>{saving ? "Saving..." : "Save"}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <pre className="whitespace-pre-wrap font-mono text-xs text-graphite-200 bg-graphite-900 rounded-lg p-4 leading-relaxed">
        {content}
      </pre>
      <div className="flex gap-2 justify-end">
        <button className="btn-secondary text-xs" onClick={() => setAiMode(true)}>Regenerate with AI</button>
        <button className="btn-secondary text-xs" onClick={() => setEditing(true)}>Edit</button>
      </div>
    </div>
  );
}
