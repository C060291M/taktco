"use client";
import { useState } from "react";

export function CopyContractLink({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    const url = `${window.location.origin}/contract/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button type="button" className="btn-secondary text-xs" onClick={copy}>
      {copied ? "Copied!" : "Copy signing link"}
    </button>
  );
}
