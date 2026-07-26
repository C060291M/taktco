"use client";
import { useUIStore } from "@/store/uiStore";

// Thin convenience wrapper so components call `useToast().success("Saved")`
// instead of reaching into the store directly.
export function useToast() {
  const pushToast = useUIStore((s) => s.pushToast);
  return {
    success: (message: string) => pushToast(message, "success"),
    error: (message: string) => pushToast(message, "error"),
    info: (message: string) => pushToast(message, "info")
  };
}
