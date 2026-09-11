"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { uploadFileSmart } from "@/lib/uploadFile";

// Rotate and delete controls for a single job photo.
//
// Rotation actually rewrites the image: the photo is drawn to a canvas turned
// 90 degrees, re-uploaded, and the record points at the new file. Storing a
// rotation flag instead would require every consumer to honor it - job page,
// portfolio, both flyer generators, every PDF - and missing one would put a
// sideways photo somewhere nobody checks. Rewriting fixes it everywhere.
const PHOTO_TYPES = [
  { value: "BEFORE", label: "Before" },
  { value: "PROGRESS", label: "Progress" },
  { value: "AFTER", label: "After" },
  { value: "INSPECTION", label: "Inspection" },
  { value: "WARRANTY", label: "Warranty" },
  { value: "MISC", label: "Misc" }
];

export function JobPhotoActions({ jobId, photoId, url, type }: { jobId: string; photoId: string; url: string; type: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function rotate() {
    setBusy("rotate");
    setError(null);
    try {
      // crossOrigin matters here: photos are served from the CDN, and a canvas
      // cannot read pixels from a cross-origin image loaded without it.
      // Loaded through our own origin rather than straight from the CDN -
      // a canvas cannot read cross-origin pixels without CORS cooperation the
      // CDN does not provide, which made rotation fail outright.
      const img = new Image();
      const loaded = new Promise<void>(function (resolve, reject) {
        img.onload = function () { resolve(); };
        img.onerror = function () { reject(new Error("Could not load the photo.")); };
      });
      img.src = url.startsWith("data:") ? url : `/api/image-proxy?url=${encodeURIComponent(url)}`;
      await loaded;

      // Swap width and height - a 90 degree turn transposes the dimensions.
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalHeight;
      canvas.height = img.naturalWidth;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable.");
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

      const blob: Blob | null = await new Promise(function (resolve) {
        canvas.toBlob(resolve, "image/jpeg", 0.92);
      });
      if (!blob) throw new Error("Could not process the photo.");

      const file = new File([blob], "rotated.jpg", { type: "image/jpeg" });
      const newUrl = await uploadFileSmart(file, "job-photos");

      const res = await fetch(`/api/jobs/${jobId}/photos/${photoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: newUrl })
      });
      if (!res.ok) throw new Error("Could not save the rotated photo.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rotate failed.");
    }
    setBusy(null);
  }

// The flyer's before/after comparison only appears when the project has one
  // photo tagged BEFORE and one tagged AFTER. Until now a mis-tagged photo
  // could only be fixed by deleting and re-uploading it, which is why projects
  // with plenty of photos kept producing single-photo flyers.
  async function changeType(next: string) {
    setBusy("type");
    setError(null);
    const res = await fetch(`/api/jobs/${jobId}/photos/${photoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, type: next })
    });
    setBusy(null);
    if (res.ok) router.refresh();
    else setError("Couldn't change the photo type.");
  }

  async function remove() {
    if (!confirm("Delete this photo? This can't be undone.")) return;
    setBusy("delete");
    setError(null);
    const res = await fetch(`/api/jobs/${jobId}/photos/${photoId}`, { method: "DELETE" });
    setBusy(null);
    if (res.ok) router.refresh();
    else setError("Couldn't delete that photo.");
  }

  return (
    <div>
<select
        className="input text-[11px] py-1 w-full mt-1"
        value={type}
        disabled={!!busy}
        onChange={(e) => changeType(e.target.value)}
      >
        {PHOTO_TYPES.map(function (t) {
          return <option key={t.value} value={t.value}>{t.label}</option>;
        })}
      </select>
      <div className="flex gap-1 mt-1">
        <button
          className="text-[11px] px-2 py-1 rounded border border-graphite-600 text-graphite-300 hover:text-white hover:border-graphite-400 disabled:opacity-50"
          disabled={!!busy}
          onClick={rotate}
          title="Rotate 90 degrees"
        >
          {busy === "rotate" ? "Rotating..." : "Rotate"}
        </button>
        <button
          className="text-[11px] px-2 py-1 rounded border border-red-500/40 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
          disabled={!!busy}
          onClick={remove}
        >
          {busy === "delete" ? "Deleting..." : "Delete"}
        </button>
      </div>
      {error && <p className="text-[11px] text-red-400 mt-1">{error}</p>}
    </div>
  );
}