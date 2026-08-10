"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function EstimateDisplayControls({
  estimateId,
  displayMode: initialDisplayMode,
  validUntil: initialValidUntil
}: {
  estimateId: string;
  displayMode: string;
  validUntil: string | null;
}) {
  const router = useRouter();
  const [displayMode, setDisplayMode] = useState(initialDisplayMode);
  const [validUntil, setValidUntil] = useState(initialValidUntil ? initialValidUntil.slice(0, 10) : "");
  const [saving, setSaving] = useState(false);

  async function save(patch: Record<string, unknown>) {
    setSaving(true);
    await fetch(`/api/estimates/${estimateId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch)
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="card p-4 flex flex-wrap items-center gap-4 text-xs">
      <div className="flex items-center gap-2">
        <span className="text-graphite-400">Client view:</span>
        <select
          className="input py-1 text-xs w-40"
          value={displayMode}
          disabled={saving}
          onChange={(e) => {
            setDisplayMode(e.target.value);
            save({ displayMode: e.target.value });
          }}
        >
          <option value="ITEMIZED">Itemized (full breakdown)</option>
          <option value="SUMMARY">Summary (scope + total only)</option>
        </select>
        <span className="text-graphite-500">
          Client will see: {displayMode === "SUMMARY" ? "Summary (scope + total only)" : "Itemized (full breakdown)"}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-graphite-400">Valid until:</span>
        <input
          className="input py-1 text-xs w-36"
          type="date"
          value={validUntil}
          disabled={saving}
          onChange={(e) => setValidUntil(e.target.value)}
          onBlur={() => save({ validUntil: validUntil || null })}
        />
        {validUntil && (
          <button
            className="text-graphite-500 hover:text-red-400"
            disabled={saving}
            onClick={() => { setValidUntil(""); save({ validUntil: null }); }}
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

