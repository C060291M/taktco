"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const PLATFORMS = [
  { value: "FACEBOOK", label: "Facebook" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "GOOGLE_BUSINESS", label: "Google Business" },
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "BLOG", label: "Blog article" }
];

export function MarketingGenerator() {
  const router = useRouter();
  const [platform, setPlatform] = useState("FACEBOOK");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    const res = await fetch("/api/marketing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform, prompt })
    });
    setLoading(false);
    if (res.ok) {
      setPrompt("");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Generation failed.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 space-y-3">
      <div className="flex gap-2">
        <select className="input w-44 shrink-0" value={platform} onChange={(e) => setPlatform(e.target.value)}>
          {PLATFORMS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
        <input
          className="input"
          placeholder="What's this post about? e.g. 'We just finished a cedar fence install in Round Rock'"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <button type="submit" className="btn-primary shrink-0" disabled={loading || !prompt.trim()}>
          {loading ? "Writing..." : "Generate"}
        </button>
      </div>
      {error && (
        <p className="text-xs text-red-400">
          {error} {error.includes("ANTHROPIC_API_KEY") && "See the README for setup."}
        </p>
      )}
    </form>
  );
}
