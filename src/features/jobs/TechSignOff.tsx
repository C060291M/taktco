"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function TechSignOff({
  jobId,
  isFieldTech,
  techSignedOffByName,
  techSignedOffAt
}: {
  jobId: string;
  isFieldTech: boolean;
  techSignedOffByName: string | null;
  techSignedOffAt: string | null;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function signOff() {
    if (!confirm("Sign off on this job as complete on your end? The office will still review and formally close it out.")) return;
    setSaving(true);
    await fetch("/api/jobs/" + jobId + "/sign-off", { method: "POST" });
    setSaving(false);
    router.refresh();
  }

  if (techSignedOffByName) {
    return (
      <div className="card p-4 border-emerald-500/40 bg-emerald-500/5">
        <p className="text-sm text-emerald-300">
          Signed off by {techSignedOffByName}
          {techSignedOffAt ? " on " + new Date(techSignedOffAt).toLocaleDateString() : ""}
        </p>
        {!isFieldTech && <p className="text-[11px] text-graphite-500 mt-1">Review the work and move status to Complete when ready.</p>}
      </div>
    );
  }

  if (!isFieldTech) return null;

  return (
    <button className="btn-primary w-full" disabled={saving} onClick={signOff}>
      {saving ? "Signing off..." : "Sign Off - My Work Is Done"}
    </button>
  );
}
