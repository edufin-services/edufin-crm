"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BellIcon, ChatIcon, FunnelIcon, CalendarIcon } from "./icons";
import { formatRelativeTime } from "@/lib/format";

type Notification = {
  id: string;
  type: "lead" | "message" | "task";
  title: string;
  message: string;
  href: string;
  createdAt: string;
  read: boolean;
};

const typeIcon: Record<Notification["type"], React.ReactNode> = {
  lead: <FunnelIcon />,
  message: <ChatIcon />,
  task: <CalendarIcon />,
};

const typeStyle: Record<Notification["type"], string> = {
  lead: "bg-brand-50 text-brand-600",
  message: "bg-blue-50 text-blue-600",
  task: "bg-amber-50 text-amber-600",
};

export default function NotificationsBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/notifications")
      .then((res) => res.json())
      .then((data) => {
        setNotifications(data.notifications ?? []);
        setUnreadCount(data.unreadCount ?? 0);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next && unreadCount > 0) {
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      await fetch("/api/notifications/read", { method: "POST" });
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleToggle}
        className="relative text-zinc-500 hover:text-zinc-700"
        aria-label="Notifications"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-brand-600" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-zinc-200 bg-white shadow-lg">
          <div className="border-b border-zinc-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-zinc-900">Notifications</h3>
          </div>
          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-zinc-400">You&apos;re all caught up.</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {notifications.map((n) => (
                <li key={n.id} className="border-b border-zinc-50 last:border-0">
                  <Link
                    href={n.href}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-zinc-50"
                  >
                    <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-full ${typeStyle[n.type]}`}>
                      {typeIcon[n.type]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-900">{n.title}</p>
                      <p className="truncate text-xs text-zinc-500">{n.message}</p>
                      <p className="mt-0.5 text-[11px] text-zinc-400">{formatRelativeTime(n.createdAt)}</p>
                    </div>
                    {!n.read && <span className="mt-1.5 h-2 w-2 flex-none rounded-full bg-brand-600" />}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
