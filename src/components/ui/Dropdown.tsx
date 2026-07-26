"use client";
import { useEffect, useRef, useState } from "react";

export function Dropdown({ trigger, children }: { trigger: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded-lg border border-graphite-600 bg-graphite-800 shadow-xl z-50 py-1">
          {children}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({ className = "", ...props }: React.HTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`w-full text-left px-3 py-2 text-sm text-graphite-200 hover:bg-graphite-700 hover:text-white ${className}`}
      {...props}
    />
  );
}
