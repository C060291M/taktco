"use client";
import { useEffect } from "react";
import { useUIStore } from "@/store/uiStore";

export function SetBreadcrumbLabel({ id, label }: { id: string; label: string }) {
  const setBreadcrumbLabel = useUIStore((s) => s.setBreadcrumbLabel);

  useEffect(() => {
    setBreadcrumbLabel(id, label);
  }, [id, label, setBreadcrumbLabel]);

  return null;
}
