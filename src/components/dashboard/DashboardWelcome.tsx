"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { formatCoins, formatUsd } from "@/data/dashboard";
import { getSession, type SessionUser } from "@/lib/session";
import { xpProgress } from "@/lib/xp";
import { coinsToUsd } from "@/lib/economy";

export function DashboardWelcome({
  offerCount,
  profileScore = 0,
  profileScoreMax = 5,
  cashoutProgress = 0,
  faucetReady = false,
  faucetWaitSec = 0,
}: {
  offerCount: number;
  profileScore?: number;
  profileScoreMax?: number;
  cashoutProgress?: number;
  faucetReady?: boolean;
  faucetWaitSec?: number;
}) {
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    const sync = () => setUser(getSession());
    sync();
    window.addEventListener("earnflow-session", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("earnflow-session", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  const name = user?.name ?? "there";
  const balance = user?.balance ?? 0;
  const streak = user?.streak ?? 0;
  const xp = user?.xp ?? 0;
  const xpBar = xpProgress(xp);
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const waitLabel =
    faucetWaitSec > 0
      ? `${Math.floor(faucetWaitSec / 60)}:${String(faucetWaitSec % 60).padStart(2, "0")}`
      : "Ready";

  return (
    <section className="animate-fade-up relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-900 via-ink-900 to-emerald-950/30 p-5 sm:p-7">
      <div
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-cyan-500/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-24 left-10 h-48 w-48 rounded-full bg-emerald-500/15 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.12) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
        aria-hidden
      />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-xl">
          <p className="text-sm font-medium text-cyan-300/90">
            {greeting} · EarnFlow hub
          </p>
          <h1 className="font-display mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {name}, let&apos;s earn
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Level {xpBar.level} · {formatCoins(xp)} XP · {streak}-day streak ·{" "}
            {profileScore}/{profileScoreMax} profile ready
          </p>

          <div className="mt-4 max-w-md">
            <div className="mb-1.5 flex items-center justify-between text-[11px] text-slate-400">
              <span>XP to level {xpBar.level + 1}</span>
              <span>
                {xpBar.intoLevel}/{xpBar.need}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-700"
                style={{ width: `${xpBar.pct}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="primary" href="/dashboard/offers">
            Browse offers
          </Button>
          <Button variant="secondary" href="/dashboard/faucet">
            Daily Free
          </Button>
          <Button variant="outline" href="/dashboard/cashout">
            Cash out
          </Button>
        </div>
      </div>

      <div className="relative mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Balance",
            value: formatCoins(balance),
            sub: formatUsd(coinsToUsd(balance)),
            href: "/dashboard/cashout",
          },
          {
            label: "Cash out progress",
            value: `${Math.min(100, Math.round(cashoutProgress))}%`,
            sub: "Min $5 to withdraw",
            href: "/dashboard/cashout",
          },
          {
            label: "Daily Free",
            value: faucetReady ? "Claim now" : waitLabel,
            sub: faucetReady ? "100 coins ready" : "Cooldown cooling down",
            href: "/dashboard/faucet",
          },
          {
            label: "Offers",
            value: String(offerCount || 0),
            sub: offerCount ? "Live offers" : "Check back soon",
            href: "/dashboard/offers",
          },
        ].map((stat, i) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="animate-fade-up group rounded-2xl border border-white/10 bg-black/25 px-4 py-3 transition hover:border-cyan-400/35 hover:bg-black/35"
            style={{ animationDelay: `${80 + i * 60}ms` }}
          >
            <p className="text-[11px] text-slate-500">{stat.label}</p>
            <p className="mt-1 text-lg font-bold text-white group-hover:text-cyan-200">
              {stat.value}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">{stat.sub}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
