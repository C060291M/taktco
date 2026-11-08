"use client";
import { useState } from "react";
import type { FormEvent } from "react";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [website, setWebsite] = useState(""); // spam trap
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, company, website })
      });
      if (res.ok) {
        setStatus("done");
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Something went wrong. Please try again.");
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setStatus("idle");
  }

  return (
    <section id="waitlist" className="max-w-xl mx-auto px-6 py-12">
      <div className="card p-6 text-center">
        <h2 className="text-2xl font-semibold text-white">The closed beta is full</h2>
        <p className="text-graphite-300 mt-2 text-sm">
          Join the waitlist and we will email you the moment a spot opens.
        </p>
        {status === "done" ? (
          <p className="mt-6 text-sm text-accent font-medium">You are on the list. We will be in touch soon.</p>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-3 text-left">
            <input className="input" type="text" placeholder="Your name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="input" type="text" placeholder="Company (optional)" value={company} onChange={(e) => setCompany(e.target.value)} />
            <input className="input" type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="hidden"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button type="submit" disabled={status === "sending"} className="btn-primary w-full py-3">
              {status === "sending" ? "Joining..." : "Join the waitlist"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}