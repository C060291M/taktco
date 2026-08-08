"use client";
import { create } from "zustand";
import type { Toast } from "@/types";

type UIState = {
  toasts: Toast[];
  pushToast: (message: string, variant?: Toast["variant"]) => void;
  dismissToast: (id: string) => void;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  quickActionOpen: boolean;
  setQuickActionOpen: (open: boolean) => void;
  breadcrumbLabels: Record<string, string>;
  setBreadcrumbLabel: (id: string, label: string) => void;
};

// Client-only UI state (toast queue, command palette visibility). Deliberately
// NOT for server data - server data stays in Prisma/server components, this is
// only for ephemeral UI concerns that need to be read from multiple components
// at once (e.g. a visible search button and the Cmd+K listener both need to
// open the same palette instance).
export const useUIStore = create<UIState>((set) => ({
  toasts: [],
  pushToast: (message, variant = "info") =>
    set((state) => ({
      toasts: [...state.toasts, { id: crypto.randomUUID(), message, variant }]
    })),
  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  quickActionOpen: false,
  setQuickActionOpen: (open) => set({ quickActionOpen: open }),
  breadcrumbLabels: {},
  setBreadcrumbLabel: (id, label) =>
    set((state) => ({ breadcrumbLabels: { ...state.breadcrumbLabels, [id]: label } }))
}));


