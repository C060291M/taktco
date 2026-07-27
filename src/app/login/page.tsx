"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { NovaBanner } from "@/components/marketing/NovaBanner";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    setLoading(false);
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      router.push(data.isPlatformAdmin ? "/admin" : "/dashboard");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Invalid email or password.");
    }
  }

  return (
    <div className="min-h-screen bg-graphite-950">
      <NovaBanner />
      <div className="flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <h1 className="text-xl font-semibold text-white">Welcome back</h1>
            <p className="text-graphite-400 text-sm mt-1">Log in to your company workspace.</p>
          </div>
          <form onSubmit={handleSubmit} className="card p-6 space-y-4">
            <div>
              <label className="block text-xs text-graphite-300 mb-1">Email</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs text-graphite-300 mb-1">Password</label>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Signing in..." : "Sign in"}
            </button>
            <p className="text-xs text-graphite-400 text-center">
              No account? <a href="/signup" className="text-accent hover:underline">Create your company</a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
