"use client";
import { useState, useRef, useEffect } from "react";
import { InsufficientCreditsModal } from "@/components/ui/InsufficientCreditsModal";
import { MarkdownLite } from "./MarkdownLite";

type Message = { role: "user" | "assistant" | "error"; text: string };

const SUGGESTIONS = [
  "How much revenue have I made this month?",
  "Which customers need follow-up?",
  "Show me my outstanding invoices",
  "How many active jobs do I have right now?"
];

export function NovaChat({ companyName }: { companyName: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    if (!text.trim() || loading) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setLoading(true);
    const res = await fetch("/api/nova-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text })
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (res.ok) {
      setMessages((m) => [...m, { role: "assistant", text: data.reply }]);
    } else if (res.status === 402) {
      setShowCreditsModal(true);
    } else {
      setMessages((m) => [...m, { role: "error", text: data.error || "Something went wrong." }]);
    }
  }

  return (
    <div className="card flex-1 flex flex-col min-h-[500px]">
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-graphite-400">Ask TAKTCO AI anything about {companyName} — try one of these:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="btn-secondary text-xs" onClick={() => send(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 text-sm whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-accent text-accent-foreground"
                  : m.role === "error"
                  ? "bg-red-500/10 text-red-300 border border-red-500/30"
                  : "bg-graphite-700 text-graphite-100"
              }`}
            >
              {m.role === "assistant" ? <MarkdownLite text={m.text} /> : m.text}
            </div>
          </div>
        ))}
        {loading && <p className="text-xs text-graphite-500">TAKTCO AI is thinking...</p>}
        <div ref={bottomRef} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="border-t border-graphite-700 p-3 flex gap-2"
      >
        <input
          className="input"
          placeholder="Ask TAKTCO AI..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button type="submit" className="btn-primary shrink-0" disabled={loading || !input.trim()}>Send</button>
      </form>
      {showCreditsModal && <InsufficientCreditsModal onClose={() => setShowCreditsModal(false)} />}
    </div>
  );
}

