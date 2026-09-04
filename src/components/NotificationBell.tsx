"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { ago } from "@/lib/admin-types";

type Notif = {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string;
  read: boolean;
  createdAt: string;
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setUserId(getSession()?.id ?? null);
    sync();
    window.addEventListener("earnflow-session", sync);
    return () => window.removeEventListener("earnflow-session", sync);
  }, []);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/notifications?userId=${userId}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (res.ok) {
        setItems(data.notifications || []);
        setUnread(data.unread || 0);
      }
    } catch {
      /* ignore */
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    void load();
    const id = window.setInterval(() => void load(), 20000);
    return () => window.clearInterval(id);
  }, [userId, load]);

  async function markAll() {
    if (!userId) return;
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, all: true }),
    });
    void load();
  }

  if (!userId) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) void load();
        }}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-300 transition hover:border-cyan-400/30 hover:text-white"
        aria-label="Notifications"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M6 9a6 6 0 1112 0c0 7 3 7 3 9H3c0-2 3-2 3-9zM10 20h4"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-ink-950">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40"
            aria-label="Close"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-2 w-[min(340px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/12 bg-ink-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-3 py-2.5">
              <p className="text-sm font-semibold text-white">Notifications</p>
              <button
                type="button"
                onClick={() => void markAll()}
                className="text-[11px] text-cyan-300 hover:underline"
              >
                Mark all read
              </button>
            </div>
            <ul className="max-h-80 overflow-y-auto">
              {!items.length && (
                <li className="px-3 py-8 text-center text-sm text-slate-500">
                  No notifications yet
                </li>
              )}
              {items.map((n) => (
                <li key={n.id}>
                  <Link
                    href={n.href || "/dashboard"}
                    onClick={() => setOpen(false)}
                    className={`block border-b border-white/5 px-3 py-2.5 transition hover:bg-white/5 ${
                      n.read ? "opacity-70" : ""
                    }`}
                  >
                    <p className="text-sm font-medium text-white">{n.title}</p>
                    <p className="mt-0.5 text-xs text-slate-400 line-clamp-2">
                      {n.body}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-600">
                      {ago(n.createdAt)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
