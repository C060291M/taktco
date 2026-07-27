"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const PRESET_COLORS = ["#3B82F6", "#22D3EE", "#A855F7", "#F97316", "#22C55E", "#EF4444"];

export function BrandingForm({ company }: { company: { name: string; logoUrl: string | null; brandAccentColor: string } }) {
  const router = useRouter();
  const [name, setName] = useState(company.name);
  const [logoUrl, setLogoUrl] = useState(company.logoUrl || "");
  const [accent, setAccent] = useState(company.brandAccentColor);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await fetch("/api/company", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, logoUrl, brandAccentColor: accent })
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="space-y-4" style={{ ["--brand-accent" as string]: accent }}>
      <div>
        <label className="block text-xs text-graphite-300 mb-1">Company name</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="block text-xs text-graphite-300 mb-1">Logo URL</label>
        <input className="input" placeholder="https://..." value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
        <p className="text-[11px] text-graphite-500 mt-1">File upload to storage is a Phase 2 wiring step — URL works today.</p>
      </div>
      <div>
        <label className="block text-xs text-graphite-300 mb-2">Accent color</label>
        <div className="flex gap-2">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setAccent(c)}
              className="h-8 w-8 rounded-full border-2"
              style={{ backgroundColor: c, borderColor: accent === c ? "#fff" : "transparent" }}
              aria-label={c}
            />
          ))}
        </div>
      </div>
      <div className="pt-2">
        <p className="text-xs text-graphite-400 mb-2">Preview</p>
        <button className="btn-primary">This is your accent color</button>
      </div>
      <button className="btn-secondary" disabled={saving} onClick={handleSave}>
        {saving ? "Saving..." : "Save branding"}
      </button>
    </div>
  );
}
