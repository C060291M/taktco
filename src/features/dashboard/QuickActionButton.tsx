"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { useUIStore } from "@/store/uiStore";

const ACTIONS = [
  { label: "New Lead", url: "/pipeline" },
  { label: "New Customer", url: "/customers" },
  { label: "New Estimate", url: "/estimates" },
  { label: "New Invoice", url: "/invoices" },
  { label: "New Project", url: "/jobs" },
  { label: "Create Task", url: "/customers" },
  { label: "Ask TAKTCO AI", url: "/nova-ai" }
];

// Floating action button, visible on every dashboard page. Deliberately
// navigates to the relevant page's own "New X" button rather than opening
// every form in a global modal - each of those forms already needs
// page-specific data (customer lists, job lists) that isn't worth
// duplicating globally just to save one click.
export function QuickActionButton() {
  const router = useRouter();
  const open = useUIStore((s) => s.quickActionOpen);
  const setOpen = useUIStore((s) => s.setQuickActionOpen);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.code === "Space") {
        e.preventDefault();
        setOpen(!useUIStore.getState().quickActionOpen);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [setOpen]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [setOpen]);

  return (
    <div ref={ref} className="fixed bottom-6 right-6 z-50">
      {open && (
        <div className="absolute bottom-16 right-0 w-56 rounded-lg border border-graphite-600 bg-graphite-800 shadow-xl py-2">
          {ACTIONS.map((a) => (
            <button
              key={a.label}
              onClick={() => {
                setOpen(false);
                router.push(a.url);
              }}
              className="w-full text-left px-4 py-2 text-sm text-graphite-100 hover:bg-graphite-700"
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        className="h-12 w-12 rounded-full bg-accent text-accent-foreground shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity"
        aria-label="Quick actions"
      >
        {open ? <X size={20} /> : <Plus size={20} />}
      </button>
    </div>
  );
}
