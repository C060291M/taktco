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

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState("");
  const [editingTaskDue, setEditingTaskDue] = useState("");

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

  function startEditNote(n: Note) {
    setEditingNoteId(n.id);
    setEditingNoteText(n.content);
  }

  async function saveNote(noteId: string) {
    if (!editingNoteText.trim()) return;
    setBusy(true);
    await fetch(`/api/notes/${noteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editingNoteText })
    });
    setEditingNoteId(null);
    setBusy(false);
    router.refresh();
  }

  async function deleteNote(noteId: string) {
    if (!confirm("Delete this note?")) return;
    setBusy(true);
    await fetch(`/api/notes/${noteId}`, { method: "DELETE" });
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

  function startEditTask(t: Task) {
    setEditingTaskId(t.id);
    setEditingTaskTitle(t.title);
    setEditingTaskDue(t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 10) : "");
  }

  async function saveTask(taskId: string) {
    if (!editingTaskTitle.trim()) return;
    setBusy(true);
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editingTaskTitle, dueDate: editingTaskDue || null })
    });
    setEditingTaskId(null);
    setBusy(false);
    router.refresh();
  }

  async function deleteTask(taskId: string) {
    if (!confirm("Delete this task?")) return;
    setBusy(true);
    await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    setBusy(false);
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
              {editingNoteId === n.id ? (
                <div className="space-y-2">
                  <input
                    className="input w-full text-sm"
                    value={editingNoteText}
                    disabled={busy}
                    onChange={(e) => setEditingNoteText(e.target.value)}
                  />
                  <div className="flex gap-2 justify-end">
                    <button className="text-xs text-graphite-400 hover:text-white" onClick={() => setEditingNoteId(null)}>Cancel</button>
                    <button className="text-xs text-accent hover:text-white" disabled={busy} onClick={() => saveNote(n.id)}>Save</button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-graphite-200">{n.pinned && "\ud83d\udccc "}{n.content}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-graphite-500">
                      {n.author?.name || "Unknown"} - {new Date(n.createdAt).toLocaleDateString()}
                    </p>
                    <div className="flex gap-2">
                      <button className="text-xs text-graphite-500 hover:text-white" onClick={() => startEditNote(n)}>Edit</button>
                      <button className="text-xs text-graphite-500 hover:text-red-400" onClick={() => deleteNote(n.id)}>Delete</button>
                    </div>
                  </div>
                </>
              )}
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
            <div key={t.id} className="text-sm">
              {editingTaskId === t.id ? (
                <div className="flex gap-2 items-center">
                  <input
                    className="input flex-1 text-sm"
                    value={editingTaskTitle}
                    disabled={busy}
                    onChange={(e) => setEditingTaskTitle(e.target.value)}
                  />
                  <input
                    className="input w-36 shrink-0"
                    type="date"
                    value={editingTaskDue}
                    disabled={busy}
                    onChange={(e) => setEditingTaskDue(e.target.value)}
                  />
                  <button className="text-xs text-graphite-400 hover:text-white shrink-0" onClick={() => setEditingTaskId(null)}>Cancel</button>
                  <button className="text-xs text-accent hover:text-white shrink-0" disabled={busy} onClick={() => saveTask(t.id)}>Save</button>
                </div>
              ) : (
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={t.completed}
                    onChange={(e) => toggleTask(t.id, e.target.checked)}
                  />
                  <span className={t.completed ? "text-graphite-500 line-through" : "text-graphite-200"}>{t.title}</span>
                  {t.dueDate && <span className="text-xs text-graphite-500 ml-auto">{new Date(t.dueDate).toLocaleDateString()}</span>}
                  <button
                    type="button"
                    className="text-xs text-graphite-500 hover:text-white opacity-0 group-hover:opacity-100"
                    onClick={(e) => { e.preventDefault(); startEditTask(t); }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="text-xs text-graphite-500 hover:text-red-400 opacity-0 group-hover:opacity-100"
                    onClick={(e) => { e.preventDefault(); deleteTask(t.id); }}
                  >
                    Delete
                  </button>
                </label>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
