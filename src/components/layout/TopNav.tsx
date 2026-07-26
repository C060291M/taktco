"use client";
import { UserMenu } from "./UserMenu";
import { NotificationsMenu } from "./NotificationsMenu";
import { Breadcrumbs } from "./Breadcrumbs";
import { Search } from "lucide-react";
import { useUIStore } from "@/store/uiStore";

export function TopNav({ userName, userRole }: { userName: string; userRole: string }) {
  const setCommandPaletteOpen = useUIStore((s) => s.setCommandPaletteOpen);

  return (
    <div className="flex items-center justify-between px-8 py-3 border-b border-graphite-700">
      <Breadcrumbs />
      <div className="flex items-center gap-3">
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center gap-2 text-graphite-400 hover:text-white text-xs border border-graphite-700 rounded-lg px-3 py-1.5"
        >
          <Search size={14} />
          Search
          <span className="text-graphite-600 border border-graphite-700 rounded px-1">⌘K</span>
        </button>
        <NotificationsMenu />
        <UserMenu userName={userName} userRole={userRole} />
      </div>
    </div>
  );
}
