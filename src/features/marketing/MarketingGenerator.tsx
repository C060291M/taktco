"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { InsufficientCreditsModal } from "@/components/ui/InsufficientCreditsModal";

const PLATFORMS = [
  { value: "FACEBOOK", label: "Facebook" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "GOOGLE_BUSINESS", label: "Google Business" },
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "X", label: "X (Twitter)" },
  { value: "TIKTOK", label: "TikTok caption" },
  { value: "YOUTUBE", label: "YouTube description" },
  { value: "BLOG", label: "Blog article" },
  { value: "NEWSLETTER", label: "Newsletter" },
  { value: "EMAIL", label: "Email" },
  { value: "SMS", label: "SMS" }
];

export function MarketingGenerator() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId") || undefined;

  const [platform, setPlatform] = useState("FACEBOOK");
  const [prompt, setPrompt] = useState(jobId ? "Write a post celebrating this completed project." : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreditsModal, setShowCreditsModal] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    const res = await fetch("/api/marketing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform, prompt, jobId })
    });
    setLoading(false);
    if (res.ok) {
      setPrompt("");
      router.refresh();
    } else if (res.status === 402) {
      setShowCreditsModal(true);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Generation failed.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 space-y-3">
      {jobId && (
        <p className="text-xs text-accent">✨ Generating from a specific project — the customer's name is never included, just the general area.</p>
      )}
      <div className="flex gap-2 flex-wrap">
        <select className="input w-44 shrink-0" value={platform} onChange={(e) => setPlatform(e.target.value)}>
          {PLATFORMS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
        <input
          className="input flex-1 min-w-[240px]"
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
      {showCreditsModal && <InsufficientCreditsModal onClose={() => setShowCreditsModal(false)} />}
    </form>
  );
}
