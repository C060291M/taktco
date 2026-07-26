"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/store/uiStore";

type Item = { id: string; title: string; subtitle: string; url: string };
type Group = { label: string; items: Item[] };

export function CommandPalette() {
  const router = useRouter();
  const open = useUIStore((s) => s.commandPaletteOpen);
  const setOpen = useUIStore((s) => s.setCommandPaletteOpen);
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const flatItems = groups.flatMap((g) => g.items);

  // Global Cmd+K / Ctrl+K listener - works from anywhere in the dashboard
  // since this component is mounted once at the layout level.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(!useUIStore.getState().commandPaletteOpen);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [setOpen]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQuery("");
      setGroups([]);
      setActiveIndex(0);
    }
  }, [open]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setGroups([]);
      return;
    }
    const timeout = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups);
        setActiveIndex(0);
      }
    }, 200); // debounce
    return () => clearTimeout(timeout);
  }, [query]);

  function go(item: Item) {
    setOpen(false);
    router.push(item.url);
  }

  function handleKeyNav(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && flatItems[activeIndex]) {
      go(flatItems[activeIndex]);
    }
  }

  if (!open) return null;

  let runningIndex = -1;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-start justify-center pt-24 z-[100] px-4" onClick={() => setOpen(false)}>
      <div className="card w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="w-full bg-transparent px-4 py-3 text-white placeholder:text-graphite-500 focus:outline-none border-b border-graphite-700"
          placeholder="Search customers, estimates, invoices, contracts, projects..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyNav}
        />
        <div className="max-h-96 overflow-y-auto">
          {query.trim().length >= 2 && flatItems.length === 0 && (
            <p className="text-sm text-graphite-400 text-center py-6">No results.</p>
          )}
          {groups.map((group) => (
            <div key={group.label}>
              <p className="text-[11px] text-graphite-500 uppercase tracking-wide px-4 pt-3 pb-1">{group.label}</p>
              {group.items.map((item) => {
                runningIndex++;
                const isActive = runningIndex === activeIndex;
                return (
                  <button
                    key={item.id}
                    onClick={() => go(item)}
                    onMouseEnter={() => setActiveIndex(runningIndex)}
                    className={`w-full text-left px-4 py-2 flex items-center justify-between ${isActive ? "bg-accent/10" : ""}`}
                  >
                    <span className="text-sm text-graphite-100">{item.title}</span>
                    <span className="text-xs text-graphite-500">{item.subtitle}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="border-t border-graphite-700 px-4 py-2 flex items-center gap-3 text-[11px] text-graphite-500">
          <span>↑↓ Navigate</span>
          <span>↵ Open</span>
          <span>Esc Close</span>
        </div>
      </div>
    </div>
  );
}
