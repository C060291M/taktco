"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const TYPES = [
  { value: "BEFORE", label: "Before" },
  { value: "PROGRESS", label: "Progress" },
  { value: "AFTER", label: "After" }
];
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

export function JobPhotoUploader({ jobId }: { jobId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState("BEFORE");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFile(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Photos only — PNG, JPG, or WEBP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Keep it under 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      setUploading(true);
      const res = await fetch(`/api/jobs/${jobId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: reader.result, type })
      });
      setUploading(false);
      if (res.ok) {
        router.refresh();
      } else {
        setError("Upload failed. Try a smaller photo.");
      }
      if (inputRef.current) inputRef.current.value = "";
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex items-center gap-2">
      <select className="input w-32 shrink-0" value={type} onChange={(e) => setType(e.target.value)}>
        {TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>
      <button
        type="button"
        className="btn-secondary text-sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? "Uploading..." : `+ Add ${TYPES.find((t) => t.value === type)?.label.toLowerCase()} photo`}
      </button>
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
