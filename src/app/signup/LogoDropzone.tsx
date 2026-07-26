"use client";
import { useRef, useState } from "react";

const ACCEPTED = ["image/png", "image/jpeg", "image/svg+xml", "image/webp", "application/pdf"];
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

export function LogoDropzone({ onChange }: { onChange: (dataUrl: string | null, fileName: string | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFile(file: File) {
    setError(null);
    if (!ACCEPTED.includes(file.type)) {
      setError("Use PNG, JPG, SVG, WEBP, or PDF.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Keep it under 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setFileName(file.name);
      setIsPdf(file.type === "application/pdf");
      setPreview(file.type === "application/pdf" ? null : dataUrl);
      onChange(dataUrl, file.name);
    };
    reader.readAsDataURL(file);
  }

  function clear() {
    setPreview(null);
    setFileName(null);
    setIsPdf(false);
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
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Logo preview" className="h-16 w-16 object-contain mx-auto rounded" />
        ) : isPdf && fileName ? (
          <div className="text-graphite-200 text-sm">📄 {fileName}</div>
        ) : (
          <>
            <p className="text-sm text-graphite-300">Drag and drop your logo here</p>
            <p className="text-xs text-graphite-500 mt-1">or click to browse — PNG, JPG, SVG, WEBP, or PDF</p>
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
      {isPdf && (
        <p className="text-[11px] text-amber-400 mt-1">
          PDF received — for best results on quotes and invoices, a PNG or SVG version will look sharper. You can swap it later in Settings.
        </p>
      )}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}
