"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadFileSmart } from "@/lib/uploadFile";

const TYPES = [
  { value: "BEFORE", label: "Before" },
  { value: "PROGRESS", label: "Progress" },
  { value: "AFTER", label: "After" },
  { value: "INSPECTION", label: "Inspection" },
  { value: "WARRANTY", label: "Warranty" },
  { value: "MISC", label: "Misc" }
];

const MAX_BYTES = 5 * 1024 * 1024; // 5MB

export function JobPhotoUploader({ jobId }: { jobId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState("BEFORE");
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  async function handleFile(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Photos only - PNG, JPG, or WEBP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Keep it under 5MB.");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadFileSmart(file, "job-photos");
      const res = await fetch(`/api/jobs/${jobId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, type, caption: caption || undefined })
      });
      if (res.ok) {
        setCaption("");
        router.refresh();
      } else {
        setError("Upload failed. Try a smaller photo.");
      }
    } catch {
      setError("Upload failed. Try again.");
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (!dragActive) setDragActive(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <select className="input w-32 shrink-0" value={type} onChange={(e) => setType(e.target.value)}>
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <input
          className="input w-40"
          placeholder="Caption (optional)"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
        />
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
          dragActive ? "border-accent bg-accent/10" : "border-graphite-700 hover:border-graphite-500"
        }`}
      >
        <p className="text-sm text-graphite-300">
          {uploading ? "Uploading..." : dragActive ? "Drop photo here" : "Drag a photo here, or click to browse"}
        </p>
        <p className="text-[11px] text-graphite-500 mt-1">PNG, JPG, or WEBP - up to 5MB</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
