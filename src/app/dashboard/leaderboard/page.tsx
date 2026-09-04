"use client";

import { useEffect, useState } from "react";
import { formatCoins } from "@/data/dashboard";
import { EmptyState } from "@/components/EmptyState";

type Row = {
  rank: number;
  user: string;
  coins: number;
  prize: string;
  prizeLabel?: string;
  prizeCoins?: number;
};

type Prize = { place: number; coins: number; label: string };

export default function LeaderboardPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [title, setTitle] = useState("Leaderboard");
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/leaderboard", { cache: "no-store" });
        const data = (await res.json()) as {
          rows?: Row[];
          prizes?: Prize[];
          title?: string;
          enabled?: boolean;
        };
        if (!cancelled) {
          setRows(data.rows ?? []);
          setPrizes(data.prizes ?? []);
          setTitle(data.title || "Leaderboard");
          setEnabled(data.enabled !== false);
        }
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-cyan-300/80">
          Ranks
        </p>
        <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-slate-400">
          Top earners by balance. Prizes are set by admin.
        </p>
      </div>

      {prizes.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-ink-900/60 p-4">
          <h2 className="text-sm font-semibold text-white">Prize pool</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {prizes.map((p) => (
              <div
                key={p.place}
                className="rounded-xl border border-white/10 bg-ink-950/50 px-3 py-2"
              >
                <p className="text-[10px] uppercase tracking-wide text-slate-500">
                  #{p.place} · {p.label}
                </p>
                <p className="text-sm font-bold text-emerald-300">
                  {formatCoins(p.coins)} coins
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {!enabled ? (
        <EmptyState
          title="Leaderboard paused"
          description="Admin turned off the public leaderboard for now."
        />
      ) : loading ? (
        <p className="text-sm text-slate-500">Loading leaderboard…</p>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No earners yet"
          description="Leaderboard fills automatically as users earn coins."
        />
      ) : (
        <>
          {/* Mobile card list */}
          <ul className="space-y-2 sm:hidden">
            {rows.map((row) => (
              <li
                key={row.rank}
                className="rounded-2xl border border-white/10 bg-ink-900/70 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-lg font-bold ${
                      row.rank <= 3 ? "text-cyan-300" : "text-slate-400"
                    }`}
                  >
                    #{row.rank}
                  </span>
                  <span className="font-semibold text-emerald-300">
                    {row.prize}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium text-white">{row.user}</span>
                  <span className="text-slate-400">
                    {formatCoins(row.coins)}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          {/* Tablet+ table */}
          <div className="hidden overflow-x-auto rounded-2xl border border-white/10 bg-ink-900/70 sm:block">
            <div className="min-w-[480px]">
              <div className="grid grid-cols-[48px_1fr_1fr_1fr] gap-2 border-b border-white/8 px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                <span>#</span>
                <span>User</span>
                <span>Coins</span>
                <span>Prize</span>
              </div>
              <ul>
                {rows.map((row) => (
                  <li
                    key={row.rank}
                    className="grid grid-cols-[48px_1fr_1fr_1fr] gap-2 border-b border-white/5 px-4 py-3 text-sm last:border-0"
                  >
                    <span
                      className={`font-bold ${
                        row.rank <= 3 ? "text-cyan-300" : "text-slate-400"
                      }`}
                    >
                      {row.rank}
                    </span>
                    <span className="truncate font-medium text-white">
                      {row.user}
                    </span>
                    <span className="text-slate-300">
                      {formatCoins(row.coins)}
                    </span>
                    <span className="font-semibold text-emerald-300">
                      {row.prize}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
