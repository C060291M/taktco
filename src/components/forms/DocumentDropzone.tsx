"use client";
import { useRef, useState } from "react";
import { uploadFileSmart } from "@/lib/uploadFile";

const ACCEPTED = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
];
const MAX_BYTES = 10 * 1024 * 1024; // 10MB

// Generic document uploader for contracts a business already has (their own PDF/DOC)
// rather than one built from a TAKTCO template. Uses real object storage when
// configured (see lib/uploadFile.ts), falls back to base64 otherwise.
export function DocumentDropzone({ onChange }: { onChange: (dataUrl: string | null, fileName: string | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    if (!ACCEPTED.includes(file.type)) {
      setError("Use PDF, DOC, or DOCX.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Keep it under 10MB.");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadFileSmart(file, "contracts");
      setFileName(file.name);
      onChange(url, file.name);
    } catch {
      setError("Upload failed. Try again.");
    }
    setUploading(false);
  }

  function clear() {
    setFileName(null);
    setError(null);
    onChange(null, null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
        onClick={() => inputRef.current?.click()}
        className={`rounded-lg border-2 border-dashed p-5 text-center cursor-pointer transition-colors ${
          dragActive ? "border-accent bg-accent/5" : "border-graphite-600 hover:border-graphite-500"
        }`}
      >
        {fileName ? (
          <div className="text-graphite-200 text-sm">📄 {fileName}</div>
        ) : uploading ? (
          <p className="text-sm text-graphite-300">Uploading...</p>
        ) : (
          <>
            <p className="text-sm text-graphite-300">Drag and drop your contract here</p>
            <p className="text-xs text-graphite-500 mt-1">or click to browse — PDF, DOC, or DOCX</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(",")}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>
      {fileName && (
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-graphite-400 truncate">{fileName}</span>
          <button type="button" onClick={clear} className="text-xs text-graphite-400 hover:text-white">Remove</button>
        </div>
      )}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}
