"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/useToast";

const VOICES = ["Professional", "Friendly", "Technical", "Marketing"];

export function MarketingProfileForm({
  initial
}: {
  initial: { brandVoice: string | null; targetAudience: string | null; googleReviewLink: string | null };
}) {
  const router = useRouter();
  const toast = useToast();
  const [voice, setVoice] = useState(initial.brandVoice || "Professional");
  const [audience, setAudience] = useState(initial.targetAudience || "");
  const [reviewLink, setReviewLink] = useState(initial.googleReviewLink || "");
  const [saving, setSaving] = useState(false);

  // Same fix as PricingMatrixClient - router.refresh() alone doesn't
  // re-sync state that was only seeded from props on first mount.
  useEffect(() => {
    setVoice(initial.brandVoice || "Professional");
    setAudience(initial.targetAudience || "");
    setReviewLink(initial.googleReviewLink || "");
  }, [initial]);

  async function save() {
    setSaving(true);
    const res = await fetch("/api/company/defaults", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brandVoice: voice, targetAudience: audience || null, googleReviewLink: reviewLink || null })
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Marketing profile saved");
      router.refresh();
    } else {
      toast.error("Couldn't save. Try again.");
    }
  }

  return (
    <div className="card p-5 space-y-3">
      <div>
        <label className="block text-xs text-graphite-300 mb-1">Brand voice</label>
        <select className="input" value={voice} onChange={(e) => setVoice(e.target.value)}>
          {VOICES.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-graphite-300 mb-1">Target audience (optional)</label>
        <input className="input" placeholder="e.g. Homeowners in growing suburbs" value={audience} onChange={(e) => setAudience(e.target.value)} />
      </div>
      <div>
        <label className="block text-xs text-graphite-300 mb-1">Google review link (optional)</label>
        <input className="input" placeholder="https://g.page/r/..." value={reviewLink} onChange={(e) => setReviewLink(e.target.value)} />
      </div>
      <p className="text-[11px] text-graphite-500">Brand voice and audience are woven into every Marketing AI generation automatically.</p>
      <button className="btn-primary" disabled={saving} onClick={save}>{saving ? "Saving..." : "Save"}</button>
    </div>
  );
}
