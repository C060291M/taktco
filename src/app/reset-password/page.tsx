"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { NovaBanner } from "@/components/marketing/NovaBanner";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password })
    });
    setLoading(false);
    if (res.ok) {
      setDone(true);
      setTimeout(function () { router.push("/login"); }, 2500);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "This reset link is invalid or has expired.");
    }
  }

  if (!token) {
    return (
      <div className="card p-6 space-y-4 text-center">
        <p className="text-sm text-red-400">This link is missing its reset token.</p>
        <a href="/forgot-password" className="text-accent text-sm hover:underline">Request a new link</a>
      </div>
    );
  }

  if (done) {
    return (
      <div className="card p-6 space-y-4 text-center">
        <p className="text-sm text-graphite-300">Your password has been reset. Redirecting you to log in...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-4">
      <div>
        <label className="block text-xs text-graphite-300 mb-1">New password</label>
        <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
      </div>
      <div>
        <label className="block text-xs text-graphite-300 mb-1">Confirm password</label>
        <input className="input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={8} required />
      </div>
      {error && (
        <p className="text-sm text-red-400">
          {error} <a href="/forgot-password" className="text-accent hover:underline">Request a new link</a>
        </p>
      )}
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "Saving..." : "Reset password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-graphite-950">
      <NovaBanner />
      <div className="flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <h1 className="text-xl font-semibold text-white">Choose a new password</h1>
          </div>
          <Suspense fallback={<div className="card p-6 text-center text-sm text-graphite-400">Loading...</div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}