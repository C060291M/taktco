"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogoDropzone } from "@/components/forms/LogoDropzone";

const PRESET_COLORS = ["#3B82F6", "#22D3EE", "#A855F7", "#F97316", "#22C55E", "#EF4444"];

const THEMES: { value: string; label: string }[] = [
  { value: "solid", label: "Solid" },
  { value: "gradient", label: "Gradient glow" },
  { value: "grid", label: "Grid pattern" }
];

type Company = {
  name: string;
  logoUrl: string | null;
  brandAccentColor: string;
  dashboardTheme: string;
};

export function BrandingForm({ company }: { company: Company }) {
  const router = useRouter();
  const [name, setName] = useState(company.name);
  const [logoUrl, setLogoUrl] = useState<string | null>(company.logoUrl || null);
  const [accent, setAccent] = useState(company.brandAccentColor);
  const [theme, setTheme] = useState(company.dashboardTheme || "solid");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await fetch("/api/company", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, logoUrl: logoUrl || "", brandAccentColor: accent, dashboardTheme: theme })
    });
    setSaving(false);
    router.refresh();
  }

  function themePreviewStyle(value: string): React.CSSProperties {
    if (value === "gradient") {
      return { backgroundImage: `radial-gradient(circle at 30% 20%, ${accent}55 0%, transparent 60%)`, backgroundColor: "#0E0F11" };
    }
    if (value === "grid") {
      return {
        backgroundImage: `linear-gradient(${accent}55 1px, transparent 1px), linear-gradient(90deg, ${accent}55 1px, transparent 1px)`,
        backgroundSize: "10px 10px",
        backgroundColor: "#0E0F11"
      };
    }
    return { backgroundColor: "#0E0F11" };
  }

  return (
    <div className="space-y-5" style={{ ["--brand-accent" as string]: accent }}>
      <div>
        <label className="block text-xs text-graphite-300 mb-1">Company name</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div>
        <label className="block text-xs text-graphite-300 mb-2">Logo</label>
        <LogoDropzone onChange={(dataUrl) => setLogoUrl(dataUrl)} />
        {logoUrl && logoUrl.startsWith("data:") && (
          <p className="text-[11px] text-graphite-500 mt-1">
            Stored locally for now — production should move this to real file storage (S3/R2). See README.
          </p>
        )}
      </div>

      <div>
        <label className="block text-xs text-graphite-300 mb-2">Accent color</label>
        <div className="flex items-center gap-2 flex-wrap">
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
          <label className="h-8 w-8 rounded-full border-2 border-graphite-500 overflow-hidden relative cursor-pointer flex items-center justify-center text-[10px] text-graphite-300" title="Custom color">
            <input
              type="color"
              value={accent}
              onChange={(e) => setAccent(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <span style={{ backgroundColor: accent }} className="absolute inset-0" />
          </label>
        </div>
        <p className="text-[11px] text-graphite-500 mt-1">Pick a preset or click the last circle to choose any color.</p>
      </div>

      <div>
        <label className="block text-xs text-graphite-300 mb-2">Dashboard background</label>
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTheme(t.value)}
              className={`rounded-lg border-2 p-2 text-left ${theme === t.value ? "border-white" : "border-graphite-600"}`}
            >
              <div className="h-10 w-full rounded" style={themePreviewStyle(t.value)} />
              <p className="text-[11px] text-graphite-300 mt-1">{t.label}</p>
            </button>
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
