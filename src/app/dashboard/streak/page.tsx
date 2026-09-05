"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { getSession, saveSession, type SessionUser } from "@/lib/session";
import { formatCoins } from "@/data/dashboard";

type Day = { day: number; reward: string; highlight?: boolean };

export default function StreakPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [streak, setStreak] = useState(0);
  const [claimedToday, setClaimedToday] = useState(false);
  const [nextReward, setNextReward] = useState(10);
  const [days, setDays] = useState<Day[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const load = useCallback(async (session: SessionUser) => {
    try {
      const res = await fetch(`/api/streak?userId=${session.id}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "Could not load streak");
        return;
      }
      setStreak(data.streak ?? 0);
      setClaimedToday(Boolean(data.claimedToday));
      setNextReward(data.nextReward ?? 10);
      setDays(data.days ?? []);
      setEnabled(data.enabled !== false);
    } catch {
      setErr("Could not load streak");
    }
  }, []);

  useEffect(() => {
    const session = getSession();
    if (!session) return;
    setUser(session);
    void load(session);
  }, [load]);

  async function claim() {
    if (!user || busy || claimedToday || !enabled) return;
    setBusy(true);
    setMsg("");
    setErr("");
    try {
      const res = await fetch("/api/streak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "Claim failed");
        if (data.claimedToday) setClaimedToday(true);
        return;
      }
      if (data.user) {
        saveSession(data.user);
        setUser(data.user);
        window.dispatchEvent(new Event("earnflow-session"));
      }
      setMsg(`Day ${data.streak} claimed · +${formatCoins(data.coins)} coins`);
      setClaimedToday(true);
      setStreak(data.streak ?? streak + 1);
      await load(data.user || user);
    } catch {
      setErr("Claim failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const currentDay = claimedToday ? streak : Math.min(7, streak + 1);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">
          Daily rewards
        </p>
        <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
          Login Streak
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Claim once per day. Miss a day and the streak resets to day 1.
        </p>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-900 via-ink-900 to-emerald-950/30 p-6 sm:p-8">
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-emerald-400/15 blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Current streak
            </p>
            <p className="mt-1 text-4xl font-bold text-white">
              {streak}
              <span className="ml-2 text-lg font-medium text-slate-400">
                day{streak === 1 ? "" : "s"}
              </span>
            </p>
            <p className="mt-2 text-sm text-cyan-300">
              {claimedToday
                ? "Already claimed today — come back tomorrow"
                : `Next claim: +${formatCoins(nextReward)} coins`}
            </p>
          </div>
          <Button
            variant="primary"
            size="lg"
            disabled={!enabled || claimedToday || busy || !user}
            onClick={() => void claim()}
          >
            {!enabled
              ? "Streak disabled"
              : claimedToday
                ? "Claimed today"
                : busy
                  ? "Claiming…"
                  : `Claim +${formatCoins(nextReward)}`}
          </Button>
        </div>
        {msg && (
          <p className="relative mt-4 text-sm text-emerald-300">{msg}</p>
        )}
        {err && <p className="relative mt-4 text-sm text-red-300">{err}</p>}
      </div>

      <section className="rounded-2xl border border-white/10 bg-ink-900/60 p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-white">7-day cycle</h2>
        <div className="mt-4 grid grid-cols-7 gap-1.5 sm:gap-2">
          {days.map((d) => {
            const done = streak >= d.day && (claimedToday || streak > d.day);
            const active = !claimedToday && currentDay === d.day;
            return (
              <div
                key={d.day}
                className={`rounded-xl border p-2 text-center sm:p-3 ${
                  active
                    ? "border-cyan-400/50 bg-cyan-500/15 shadow-[0_0_20px_rgba(34,211,238,0.12)]"
                    : done
                      ? "border-emerald-400/30 bg-emerald-500/10"
                      : "border-white/10 bg-white/[0.03]"
                }`}
              >
                <p className="text-[9px] text-slate-500 sm:text-[10px]">
                  D{d.day}
                </p>
                <p
                  className={`mt-1 text-[10px] font-bold sm:text-xs ${
                    active
                      ? "text-cyan-300"
                      : done
                        ? "text-emerald-300"
                        : "text-slate-300"
                  }`}
                >
                  {d.reward}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
