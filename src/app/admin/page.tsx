"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminShell, useAdmin } from "@/components/admin/AdminProvider";
import { Badge } from "@/components/admin/AdminUI";
import { formatCoins, formatUsd } from "@/data/dashboard";
import { ago } from "@/lib/admin-types";

type Analytics = {
  signups: { date: string; count: number }[];
  cashouts: { date: string; count: number; usd: number }[];
  earningsEvents: { date: string; count: number }[];
  totals: {
    signups: number;
    cashoutUsd: number;
    contactNew: number;
    chatWaiting: number;
  };
};

function MiniBars({
  data,
  color = "bg-cyan-400",
}: {
  data: { count: number }[];
  color?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="flex h-16 items-end gap-0.5">
      {data.map((d, i) => (
        <div
          key={i}
          className={`min-w-0 flex-1 rounded-t ${color} opacity-80`}
          style={{ height: `${Math.max(6, (d.count / max) * 100)}%` }}
          title={String(d.count)}
        />
      ))}
    </div>
  );
}

export default function AdminOverviewPage() {
  const { stats, settings, api } = useAdmin();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await api<Analytics>("/api/admin/analytics");
      if (res.ok) setAnalytics(res.data);
    })();
  }, [api]);

  return (
    <AdminShell
      title="Command"
      subtitle="Live ops overview — jump into any control page"
    >
      {!stats || !settings ? (
        <p className="text-sm text-slate-500">Loading command center…</p>
      ) : (
        <div className="animate-fade-up space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Users",
                value: formatCoins(stats.users.total),
                sub: `${stats.users.active} active · ${stats.users.banned} banned`,
                href: "/admin/users",
                tone: "from-cyan-500/20",
              },
              {
                label: "Pending payouts",
                value: formatUsd(stats.cashouts.pendingUsd),
                sub: `${stats.cashouts.pending} requests`,
                href: "/admin/cashouts",
                tone: "from-amber-500/20",
              },
              {
                label: "Circulating coins",
                value: formatCoins(stats.economy.circulatingCoins),
                sub: `${stats.economy.redeemActive} live codes`,
                href: "/admin/redeem",
                tone: "from-emerald-500/20",
              },
              {
                label: "Inbox / Chat",
                value: String(
                  (analytics?.totals.contactNew ?? 0) +
                    (stats.support?.waiting ?? 0),
                ),
                sub: `${analytics?.totals.contactNew ?? 0} contact · ${stats.support?.waiting ?? 0} chat`,
                href: "/admin/contact",
                tone: "from-sky-500/20",
              },
            ].map((c) => (
              <Link
                key={c.label}
                href={c.href}
                className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${c.tone} to-ink-900/80 p-4 transition hover:border-cyan-400/30`}
              >
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  {c.label}
                </p>
                <p className="mt-1 font-display text-2xl font-bold text-white">
                  {c.value}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">{c.sub}</p>
              </Link>
            ))}
          </div>

          {analytics && (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-ink-900/60 p-4">
                <p className="text-xs font-semibold text-white">
                  Signups (14d) · {analytics.totals.signups}
                </p>
                <div className="mt-3">
                  <MiniBars data={analytics.signups} />
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-ink-900/60 p-4">
                <p className="text-xs font-semibold text-white">
                  Earn events (14d)
                </p>
                <div className="mt-3">
                  <MiniBars
                    data={analytics.earningsEvents}
                    color="bg-emerald-400"
                  />
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-ink-900/60 p-4">
                <p className="text-xs font-semibold text-white">
                  Cash outs · {formatUsd(analytics.totals.cashoutUsd)}
                </p>
                <div className="mt-3">
                  <MiniBars
                    data={analytics.cashouts}
                    color="bg-amber-400"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-5">
            <div className="space-y-3 rounded-2xl border border-white/10 bg-ink-900/60 p-4 lg:col-span-2">
              <h3 className="text-sm font-semibold text-white">Quick pages</h3>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["/admin/users", "Users", `${stats.users.kycPending} KYC`],
                    [
                      "/admin/cashouts",
                      "Payouts",
                      `${stats.cashouts.pending} pending`,
                    ],
                    [
                      "/admin/contact",
                      "Inbox",
                      `${analytics?.totals.contactNew ?? 0} new`,
                    ],
                    [
                      "/admin/leaderboard",
                      "Leaderboard",
                      `${(settings.rankPrizes || []).length} prizes`,
                    ],
                    [
                      "/admin/chat",
                      "Live Chat",
                      `${stats.support?.waiting ?? 0} waiting`,
                    ],
                    [
                      "/admin/catalog",
                      "Catalog",
                      `${stats.site.offers} offers`,
                    ],
                    ["/admin/landing", "Landing", "Edit copy"],
                    [
                      "/admin/controls",
                      "Controls",
                      settings.forceErrorMode ? "500 ON" : "Healthy",
                    ],
                  ] as const
                ).map(([href, title, meta]) => (
                  <Link
                    key={href}
                    href={href}
                    className="rounded-xl border border-white/10 bg-ink-950/50 p-3 text-left transition hover:border-cyan-400/30 hover:bg-ink-950"
                  >
                    <p className="text-sm font-medium text-white">{title}</p>
                    <p className="text-[11px] text-slate-500">{meta}</p>
                  </Link>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Badge tone={stats.users.frozen ? "warn" : "ok"}>
                  {stats.users.frozen} frozen
                </Badge>
                <Badge tone={stats.users.unverifiedEmail ? "info" : "ok"}>
                  {stats.users.unverifiedEmail} unverified
                </Badge>
                <Badge tone="neutral">
                  {stats.site.offers} offers
                </Badge>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-ink-900/60 p-4 lg:col-span-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">
                  Live activity
                </h3>
                <Badge tone="info">feed</Badge>
              </div>
              <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto">
                {(stats.recent || []).length === 0 ? (
                  <li className="text-sm text-slate-500">No recent activity.</li>
                ) : (
                  stats.recent.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-ink-950/40 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm text-white">
                          <span className="font-medium text-cyan-200">
                            {a.user}
                          </span>{" "}
                          · {a.source}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {ago(a.createdAt)} · {a.type}
                        </p>
                      </div>
                      <span className="shrink-0 font-mono text-sm text-emerald-300">
                        +{a.amount}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
