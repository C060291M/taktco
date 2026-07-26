"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Note = { id: string; content: string; pinned: boolean; createdAt: Date | string; author: { name: string } | null };
type Task = { id: string; title: string; dueDate: Date | string | null; completed: boolean; priority: string };

export function LeadNotesTasks({ leadId, notes, tasks }: { leadId: string; notes: Note[]; tasks: Task[] }) {
  const router = useRouter();
  const [noteText, setNoteText] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [busy, setBusy] = useState(false);

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteText.trim()) return;
    setBusy(true);
    await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId, content: noteText })
    });
    setNoteText("");
    setBusy(false);
    router.refresh();
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    setBusy(true);
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId, title: taskTitle, dueDate: taskDue || null })
    });
    setTaskTitle("");
    setTaskDue("");
    setBusy(false);
    router.refresh();
  }

  async function toggleTask(taskId: string, completed: boolean) {
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed })
    });
    router.refresh();
  }

  const sortedNotes = [...notes].sort((a, b) => Number(b.pinned) - Number(a.pinned));

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="card p-5">
        <h2 className="text-sm font-medium text-white mb-3">Notes</h2>
        <form onSubmit={addNote} className="flex gap-2 mb-4">
          <input className="input" placeholder="Add a note..." value={noteText} onChange={(e) => setNoteText(e.target.value)} />
          <button type="submit" className="btn-primary shrink-0" disabled={busy || !noteText.trim()}>Add</button>
        </form>
        <div className="space-y-3">
          {sortedNotes.length === 0 && <p className="text-sm text-graphite-400">No notes yet.</p>}
          {sortedNotes.map((n) => (
            <div key={n.id} className="text-sm border-b border-graphite-700 pb-2 last:border-0">
              <p className="text-graphite-200">{n.pinned && "📌 "}{n.content}</p>
              <p className="text-xs text-graphite-500 mt-1">
                {n.author?.name || "Unknown"} · {new Date(n.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-medium text-white mb-3">Tasks</h2>
        <form onSubmit={addTask} className="flex gap-2 mb-4">
          <input className="input" placeholder="New task..." value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
          <input className="input w-36 shrink-0" type="date" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} />
          <button type="submit" className="btn-primary shrink-0" disabled={busy || !taskTitle.trim()}>Add</button>
        </form>
        <div className="space-y-2">
          {tasks.length === 0 && <p className="text-sm text-graphite-400">No tasks yet.</p>}
          {tasks.map((t) => (
            <label key={t.id} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={t.completed}
                onChange={(e) => toggleTask(t.id, e.target.checked)}
              />
              <span className={t.completed ? "text-graphite-500 line-through" : "text-graphite-200"}>{t.title}</span>
              {t.dueDate && <span className="text-xs text-graphite-500 ml-auto">{new Date(t.dueDate).toLocaleDateString()}</span>}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
