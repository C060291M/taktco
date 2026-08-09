"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const TYPES = [
  { value: "CALL", label: "Call" },
  { value: "TEXT", label: "Text" },
  { value: "EMAIL", label: "Email" },
  { value: "NOTE", label: "Note" }
];

export function LogCommunicationForm({ customerId }: { customerId: string }) {
  const router = useRouter();
  const [type, setType] = useState("CALL");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    const res = await fetch("/api/communications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId, type, content })
    });
    setLoading(false);
    if (res.ok) {
      setContent("");
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-[7rem,1fr,auto] gap-2">
      <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
        {TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>
      <input
        className="input"
        placeholder="What happened?"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <button type="submit" className="btn-primary" disabled={loading || !content.trim()}>
        {loading ? "Logging..." : "Log"}
      </button>
    </form>
  );
}
