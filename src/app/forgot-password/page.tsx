"use client";
import { useState } from "react";
import { NovaBanner } from "@/components/marketing/NovaBanner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    setLoading(false);
    // Always shows the same success state regardless of the response - the
    // API itself never reveals whether the email matched an account, and
    // the UI should not undo that by branching on success/failure here.
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen bg-graphite-950">
      <NovaBanner />
      <div className="flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <h1 className="text-xl font-semibold text-white">Reset your password</h1>
            <p className="text-graphite-400 text-sm mt-1">We will email you a link to choose a new one.</p>
          </div>
          {submitted ? (
            <div className="card p-6 space-y-4 text-center">
              <p className="text-sm text-graphite-300">If an account exists for <span className="text-white">{email}</span>, a reset link is on its way. Check your inbox.</p>
              <a href="/login" className="text-accent text-sm hover:underline">Back to login</a>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="card p-6 space-y-4">
              <div>
                <label className="block text-xs text-graphite-300 mb-1">Email</label>
                <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? "Sending..." : "Send reset link"}
              </button>
              <p className="text-xs text-graphite-400 text-center">
                <a href="/login" className="text-accent hover:underline">Back to login</a>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}