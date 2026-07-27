"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    companyName: "",
    tradeType: "",
    name: "",
    email: "",
    password: ""
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    setLoading(false);
    if (res.ok) {
      router.push("/dashboard");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Something went wrong.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-graphite-950 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-white">
            Nova<span className="text-accent">OS</span>
          </h1>
          <p className="text-graphite-300 text-sm mt-1">Built for the people who build.</p>
        </div>
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="block text-xs text-graphite-300 mb-1">Company name</label>
            <input className="input" value={form.companyName} onChange={(e) => update("companyName", e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs text-graphite-300 mb-1">What do you do?</label>
            <select className="input" value={form.tradeType} onChange={(e) => update("tradeType", e.target.value)} required>
              <option value="">Select a trade</option>
              <option>Fencing</option>
              <option>General Contracting</option>
              <option>Electrical</option>
              <option>HVAC</option>
              <option>Plumbing</option>
              <option>Landscaping</option>
              <option>Roofing</option>
              <option>Concrete</option>
              <option>Painting</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-graphite-300 mb-1">Your name</label>
            <input className="input" value={form.name} onChange={(e) => update("name", e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs text-graphite-300 mb-1">Email</label>
            <input className="input" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs text-graphite-300 mb-1">Password</label>
            <input className="input" type="password" minLength={8} value={form.password} onChange={(e) => update("password", e.target.value)} required />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Creating your workspace..." : "Create company workspace"}
          </button>
          <p className="text-xs text-graphite-400 text-center">
            Already have an account? <a href="/login" className="text-accent hover:underline">Sign in</a>
          </p>
        </form>
      </div>
    </div>
  );
}
