"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";

type Notification = {
  id: string;
  category: string;
  title: string;
  body: string | null;
  linkUrl: string | null;
  read: boolean;
  createdAt: string;
};

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function NotificationsMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    const res = await fetch("/api/notifications");
    if (res.ok) {
      const data = await res.json();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    }
  }

  useEffect(() => {
    load();
    // Light polling so the unread badge updates without a full page refresh -
    // no websocket infra yet, this is the cheap version of "real-time."
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function markAllRead() {
    await fetch("/api/notifications/mark-all-read", { method: "POST" });
    load();
  }

  async function handleClickNotification(n: Notification) {
    if (!n.read) {
      await fetch(`/api/notifications/${n.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true })
      });
    }
    setOpen(false);
    if (n.linkUrl) router.push(n.linkUrl);
    load();
  }

  return (
    <div className="relative" ref={ref}>
      <button className="relative text-graphite-300 hover:text-white p-1.5" onClick={() => setOpen((o) => !o)}>
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-accent text-accent-foreground text-[10px] font-medium flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-lg border border-graphite-600 bg-graphite-800 shadow-xl z-50">
          <div className="flex items-center justify-between px-3 py-2 border-b border-graphite-700">
            <p className="text-sm font-medium text-white">Notifications</p>
            {unreadCount > 0 && (
              <button className="text-xs text-accent hover:underline" onClick={markAllRead}>Mark all as read</button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-3 py-6 text-center">
                <p className="text-sm text-graphite-400">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClickNotification(n)}
                  className={`w-full text-left px-3 py-2.5 border-b border-graphite-700 last:border-0 hover:bg-graphite-700 ${
                    n.read ? "" : "bg-accent/5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm ${n.read ? "text-graphite-300" : "text-white font-medium"}`}>{n.title}</p>
                    {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0 mt-1.5" />}
                  </div>
                  {n.body && <p className="text-xs text-graphite-400 mt-0.5 line-clamp-2">{n.body}</p>}
                  <p className="text-[10px] text-graphite-500 mt-1">{timeAgo(n.createdAt)}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
