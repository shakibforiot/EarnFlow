"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ACTIVITY_TTL_MS } from "@/lib/activity-ttl";

const FEED_LIMIT = 20;

type FeedEvent = {
  id: string;
  type: "earn" | "cashout";
  user: string;
  amount: string;
  source: string;
  userId?: string;
  createdAt: number;
};

function freshOnly(list: FeedEvent[]) {
  const cutoff = Date.now() - ACTIVITY_TTL_MS;
  return list.filter((e) => e.createdAt >= cutoff);
}

function signature(e: FeedEvent) {
  return `${e.userId || e.user}|${e.type}|${e.source}|${e.amount}`;
}

/** One chip per unique look — no duplicate Streak/+10 spam */
function uniqueFeed(list: FeedEvent[], limit = FEED_LIMIT) {
  const byId = new Map<string, FeedEvent>();
  for (const e of list) {
    if (!byId.has(e.id)) byId.set(e.id, e);
  }
  const sorted = [...byId.values()].sort((a, b) => b.createdAt - a.createdAt);
  const seenSig = new Set<string>();
  const out: FeedEvent[] = [];
  for (const e of sorted) {
    const sig = signature(e);
    if (seenSig.has(sig)) continue;
    seenSig.add(sig);
    out.push(e);
    if (out.length >= limit) break;
  }
  return out;
}

function EventChip({ event }: { event: FeedEvent }) {
  const className =
    "inline-flex shrink-0 items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-xs transition hover:border-cyan-400/40 hover:bg-cyan-500/10";
  const inner = (
    <>
      <span
        className={`rounded-md px-1.5 py-0.5 font-medium ${
          event.type === "cashout"
            ? "bg-emerald-500/15 text-emerald-300"
            : "bg-cyan-500/15 text-cyan-300"
        }`}
      >
        {event.source}
      </span>
      <span className="text-slate-400">{event.user}</span>
      <span className="font-semibold text-white">+{event.amount}</span>
      <span className="text-slate-500">coins</span>
    </>
  );

  if (event.userId) {
    return (
      <Link
        href={`/dashboard/u/${event.userId}`}
        className={className}
        title="View profile"
      >
        {inner}
      </Link>
    );
  }

  return <div className={className}>{inner}</div>;
}

export function LiveFeed() {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [status, setStatus] = useState<"connecting" | "live" | "polling">(
    "connecting",
  );

  useEffect(() => {
    let cancelled = false;
    let source: EventSource | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let pruneTimer: ReturnType<typeof setInterval> | null = null;

    const mergeEvent = (incoming: FeedEvent) => {
      setEvents((prev) => uniqueFeed(freshOnly([incoming, ...prev])));
    };

    const applySnapshot = (incoming: FeedEvent[]) => {
      const next = uniqueFeed(freshOnly(incoming ?? []));
      // Never wipe a non-empty feed with an empty SSE snapshot
      setEvents((prev) => {
        if (next.length === 0 && prev.length > 0) return prev;
        return next;
      });
    };

    const loadSnapshot = async () => {
      try {
        const res = await fetch("/api/activity", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { events: FeedEvent[] };
        if (!cancelled) applySnapshot(data.events ?? []);
      } catch {
        /* ignore */
      }
    };

    const startPolling = () => {
      setStatus("polling");
      void loadSnapshot();
      pollTimer = setInterval(() => {
        void loadSnapshot();
      }, 4000);
    };

    void loadSnapshot();

    pruneTimer = setInterval(() => {
      setEvents((prev) => uniqueFeed(freshOnly(prev)));
    }, 15000);

    try {
      source = new EventSource("/api/activity/stream");

      source.addEventListener("snapshot", (msg) => {
        try {
          const data = JSON.parse((msg as MessageEvent).data) as {
            events: FeedEvent[];
          };
          if (!cancelled) {
            applySnapshot(data.events ?? []);
            setStatus("live");
          }
        } catch {
          /* ignore */
        }
      });

      source.addEventListener("activity", (msg) => {
        try {
          const event = JSON.parse((msg as MessageEvent).data) as FeedEvent;
          if (!cancelled) {
            mergeEvent(event);
            setStatus("live");
          }
        } catch {
          /* ignore */
        }
      });

      source.onerror = () => {
        source?.close();
        source = null;
        if (!cancelled) startPolling();
      };
    } catch {
      startPolling();
    }

    return () => {
      cancelled = true;
      source?.close();
      if (pollTimer) clearInterval(pollTimer);
      if (pruneTimer) clearInterval(pruneTimer);
    };
  }, []);

  const fresh = useMemo(() => uniqueFeed(freshOnly(events)), [events]);

  return (
    <div className="border-b border-white/8 bg-ink-900/60">
      <div className="relative py-2.5">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-ink-900 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-ink-900 to-transparent" />

        {fresh.length > 0 ? (
          <div
            className="flex gap-3 overflow-x-auto px-4 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {fresh.map((event) => (
              <EventChip key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="px-4 text-center text-xs text-slate-500">
            No recent activity yet
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-2 pb-2 text-[10px] text-slate-500">
        <span
          className={`inline-flex items-center gap-1 ${
            status === "live"
              ? "text-emerald-400"
              : status === "polling"
                ? "text-amber-400"
                : "text-slate-500"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              status === "live"
                ? "animate-pulse bg-emerald-400"
                : status === "polling"
                  ? "bg-amber-400"
                  : "bg-slate-500"
            }`}
          />
          {status === "live"
            ? fresh.length > 0
              ? `Live · ${fresh.length} unique · swipe to scroll`
              : "Live"
            : status === "polling"
              ? "Updating"
              : "Connecting"}
        </span>
      </div>
    </div>
  );
}
