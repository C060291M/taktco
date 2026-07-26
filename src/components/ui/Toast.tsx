"use client";
import { useUIStore } from "@/store/uiStore";
import { useEffect } from "react";

const VARIANT_STYLES: Record<string, string> = {
  success: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  error: "border-red-500/40 bg-red-500/10 text-red-300",
  info: "border-graphite-600 bg-graphite-800 text-graphite-100"
};

// Mount this once, near the root of the dashboard layout. Any component can
// trigger a toast via useToast() without prop-drilling or context wiring.
export function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts);
  const dismissToast = useUIStore((s) => s.dismissToast);

  useEffect(() => {
    const timers = toasts.map((t) => setTimeout(() => dismissToast(t.id), 4000));
    return () => timers.forEach(clearTimeout);
  }, [toasts, dismissToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] space-y-2 w-80">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`rounded-lg border px-4 py-3 text-sm shadow-lg cursor-pointer ${VARIANT_STYLES[t.variant]}`}
          onClick={() => dismissToast(t.id)}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
