"use client";
import { useState } from "react";

export function CopyPublicLink({ token, basePath, label }: { token: string; basePath: "estimate" | "invoice"; label?: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    const url = `${window.location.origin}/${basePath}/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button type="button" className="btn-secondary text-xs" onClick={copy}>
      {copied ? "Copied!" : label || `Copy customer ${basePath === "invoice" ? "payment" : "approval"} link`}
    </button>
  );
}
