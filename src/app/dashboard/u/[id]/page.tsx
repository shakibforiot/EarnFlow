"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/Button";
import { formatCoins, formatUsd } from "@/data/dashboard";
import { getSession } from "@/lib/session";
import { xpProgress } from "@/lib/xp";

type OfferRow = {
  id: string;
  source: string;
  coins: number;
  createdAt: string;
};

type TopSource = {
  source: string;
  coins: number;
  count: number;
};

type PublicProfile = {
  id: string;
  displayName: string;
  name: string;
  country: string;
  level: number;
  streak: number;
  xp?: number;
  emailVerified: boolean;
  memberSince: string | null;
  profilePrivate: boolean;
  accountStatus: string;
};

function sourceTone(source: string): {
  bar: string;
  amount: string;
} {
  const s = source.toLowerCase();
  if (s.includes("streak"))
    return { bar: "bg-amber-400", amount: "text-amber-200" };
  if (s.includes("faucet") || s.includes("daily free"))
    return { bar: "bg-cyan-400", amount: "text-cyan-300" };
  if (s.includes("task"))
    return { bar: "bg-sky-400", amount: "text-sky-200" };
  if (s.includes("refer"))
    return { bar: "bg-emerald-400", amount: "text-emerald-300" };
  if (s.includes("redeem"))
    return { bar: "bg-violet-400", amount: "text-violet-200" };
  return { bar: "bg-cyan-400/70", amount: "text-cyan-300" };
}

export default function PublicUserProfilePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const me = getSession();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [message, setMessage] = useState("");
  const [summary, setSummary] = useState<{
    totalEarnedCoins: number;
    totalEarnedUsd: number;
    offerCount: number;
    xp: number;
  } | null>(null);
  const [topSources, setTopSources] = useState<TopSource[]>([]);
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [activityPage, setActivityPage] = useState(1);

  const ACTIVITY_PAGE_SIZE = 8;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/users/${id}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) {
          if (!cancelled) setError(data.error || "Profile not found");
          return;
        }
        if (cancelled) return;
        setProfile(data.profile);
        setIsPrivate(Boolean(data.private));
        setMessage(data.message || "");
        setSummary(data.summary);
        setTopSources(data.topSources ?? []);
        setOffers(data.offers ?? []);
        setActivityPage(1);
      } catch {
        if (!cancelled) setError("Unable to load profile");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const xpBar = useMemo(
    () => xpProgress(summary?.xp ?? profile?.xp ?? 0),
    [summary?.xp, profile?.xp],
  );

  const activityTotalPages = Math.max(
    1,
    Math.ceil(offers.length / ACTIVITY_PAGE_SIZE),
  );
  const safeActivityPage = Math.min(activityPage, activityTotalPages);
  const pagedOffers = useMemo(() => {
    const start = (safeActivityPage - 1) * ACTIVITY_PAGE_SIZE;
    return offers.slice(start, start + ACTIVITY_PAGE_SIZE);
  }, [offers, safeActivityPage]);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-white/5" />
        <div className="h-44 animate-pulse rounded-3xl bg-white/5" />
        <div className="grid grid-cols-3 gap-3">
          <div className="h-20 animate-pulse rounded-2xl bg-white/5" />
          <div className="h-20 animate-pulse rounded-2xl bg-white/5" />
          <div className="h-20 animate-pulse rounded-2xl bg-white/5" />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <p className="text-sm text-red-300">{error || "Profile not found"}</p>
        <Button variant="secondary" href="/dashboard">
          Back to dashboard
        </Button>
      </div>
    );
  }

  const isMe = me?.id === profile.id;
  const memberLabel = profile.memberSince
    ? new Date(profile.memberSince).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-cyan-300/80">
            Member spotlight
          </p>
          <h1 className="font-display mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {profile.displayName}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Public EarnFlow profile
            {isPrivate ? " · Private account" : ""}
            {isMe ? " · This is you" : ""}
          </p>
        </div>
        <Button variant="outline" size="sm" href="/dashboard">
          Back
        </Button>
      </div>

      <section className="animate-fade-up relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-900 via-ink-900 to-emerald-950/35 p-5 sm:p-7">
        <div
          className="pointer-events-none absolute -right-14 -top-16 h-52 w-52 rounded-full bg-cyan-500/20 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-20 left-6 h-44 w-44 rounded-full bg-emerald-500/15 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.14) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.14) 1px, transparent 1px)",
            backgroundSize: "26px 26px",
          }}
          aria-hidden
        />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="relative flex h-16 w-16 flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-400 to-emerald-500 shadow-lg shadow-cyan-500/25 sm:h-20 sm:w-20">
                <div className="flex flex-1 items-center justify-center text-2xl font-bold text-ink-950 sm:text-3xl">
                  {(profile.name || "?").slice(0, 1).toUpperCase()}
                </div>
                <span className="bg-ink-950/90 py-0.5 text-center text-[10px] font-bold tracking-wide text-cyan-300">
                  Lv {profile.level}
                </span>
              </div>
            </div>
            <div>
              <p className="text-xl font-bold text-white sm:text-2xl">
                {profile.displayName}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                <span className="rounded-full bg-white/5 px-2.5 py-1 text-slate-300">
                  {profile.streak}-day streak
                </span>
                {profile.country ? (
                  <span className="rounded-full bg-white/5 px-2.5 py-1 text-slate-300">
                    {profile.country}
                  </span>
                ) : null}
                <span
                  className={`rounded-full px-2.5 py-1 font-semibold ${
                    profile.emailVerified
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-amber-500/15 text-amber-300"
                  }`}
                >
                  {profile.emailVerified ? "Verified" : "Unverified"}
                </span>
                {isPrivate ? (
                  <span className="rounded-full bg-violet-500/15 px-2.5 py-1 font-semibold text-violet-200">
                    Private
                  </span>
                ) : null}
                {profile.accountStatus !== "active" ? (
                  <span className="rounded-full bg-red-500/15 px-2.5 py-1 font-semibold text-red-200 capitalize">
                    {profile.accountStatus}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 sm:min-w-[160px]">
            <p className="text-[10px] uppercase tracking-wide text-slate-500">
              Member since
            </p>
            <p className="mt-1 text-sm font-semibold text-white">{memberLabel}</p>
            <p className="mt-0.5 text-[11px] text-slate-500 capitalize">
              Status · {profile.accountStatus || "active"}
            </p>
          </div>
        </div>

        <div className="relative mt-5">
          <div className="mb-1.5 flex items-center justify-between text-[11px] text-slate-400">
            <span>XP to level {xpBar.level + 1}</span>
            <span>
              {xpBar.intoLevel}/{xpBar.need} · {formatCoins(summary?.xp ?? profile.xp ?? 0)} XP
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-700"
              style={{ width: `${xpBar.pct}%` }}
            />
          </div>
        </div>
      </section>

      {isPrivate ? (
        <div className="animate-fade-up rounded-3xl border border-dashed border-violet-400/25 bg-violet-500/5 px-5 py-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-200">
            <LockIcon />
          </div>
          <p className="mt-4 text-lg font-semibold text-white">Activity hidden</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-slate-400">
            {message ||
              "This user set their account to private. You can see their profile, but not what they completed."}
          </p>
          <div className="mx-auto mt-5 grid max-w-sm grid-cols-3 gap-2 opacity-40">
            {["Earned", "USD", "Offers"].map((label) => (
              <div
                key={label}
                className="rounded-xl border border-white/10 bg-ink-950/40 px-2 py-3"
              >
                <p className="text-[10px] text-slate-500">{label}</p>
                <p className="mt-1 text-sm font-bold text-slate-600">•••</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                label: "Lifetime earned",
                value: formatCoins(summary?.totalEarnedCoins ?? 0),
                hint: "All-time coins",
                accent: "text-cyan-300",
                glow: "from-cyan-500/15 to-transparent",
              },
              {
                label: "USD value",
                value: formatUsd(summary?.totalEarnedUsd ?? 0),
                hint: "Approx. cash value",
                accent: "text-emerald-300",
                glow: "from-emerald-500/15 to-transparent",
              },
              {
                label: "Completions",
                value: String(summary?.offerCount ?? 0),
                hint: "Earn events",
                accent: "text-white",
                glow: "from-sky-500/10 to-transparent",
              },
              {
                label: "Streak",
                value: `${profile.streak}d`,
                hint: "Current run",
                accent: "text-amber-200",
                glow: "from-amber-500/15 to-transparent",
              },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className="animate-fade-up relative overflow-hidden rounded-2xl border border-white/10 bg-ink-900/70 p-4"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${stat.glow}`}
                  aria-hidden
                />
                <p className="relative text-[11px] font-medium text-slate-400">
                  {stat.label}
                </p>
                <p className={`relative mt-1.5 text-xl font-bold tracking-tight ${stat.accent}`}>
                  {stat.value}
                </p>
                <p className="relative mt-1 text-[10px] text-slate-500">
                  {stat.hint}
                </p>
              </div>
            ))}
          </div>

          {topSources.length > 0 ? (
            <section className="animate-fade-up rounded-2xl border border-white/10 bg-ink-900/60 p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-white">Top earn sources</h2>
                <span className="text-[11px] text-slate-500">Recent mix</span>
              </div>
              <ul className="mt-4 space-y-2">
                {topSources.map((row) => {
                  const max = topSources[0]?.coins || 1;
                  const pct = Math.max(8, Math.round((row.coins / max) * 100));
                  return (
                    <li key={row.source}>
                      <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                        <span className="font-medium text-slate-200">
                          {row.source}
                        </span>
                        <span className="text-cyan-300">
                          +{formatCoins(row.coins)}
                          <span className="ml-1 text-[11px] text-slate-500">
                            · {row.count}x
                          </span>
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          <section className="animate-fade-up rounded-2xl border border-white/10 bg-ink-900/60 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-white">Completed activity</h2>
              {offers.length > 0 ? (
                <span className="text-[11px] text-slate-500">
                  {offers.length} recent · page {safeActivityPage}/
                  {activityTotalPages}
                </span>
              ) : (
                <span className="text-[11px] text-slate-500">0 recent</span>
              )}
            </div>
            {!offers.length ? (
              <p className="mt-4 text-sm text-slate-500">No public activity yet.</p>
            ) : (
              <>
                <ul className="mt-4 space-y-2">
                  {pagedOffers.map((offer) => {
                    const tone = sourceTone(offer.source);
                    return (
                      <li
                        key={offer.id}
                        className="relative overflow-hidden rounded-xl border border-white/8 bg-ink-950/40 px-3 py-3"
                      >
                        <div
                          className={`absolute inset-y-2 left-2 w-1 rounded-full ${tone.bar}`}
                          aria-hidden
                        />
                        <div className="flex items-center justify-between gap-3 pl-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-white">
                              {offer.source}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {new Date(offer.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <p
                            className={`shrink-0 text-sm font-semibold ${tone.amount}`}
                          >
                            +{formatCoins(offer.coins)}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {activityTotalPages > 1 ? (
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      disabled={safeActivityPage <= 1}
                      onClick={() =>
                        setActivityPage((p) => Math.max(1, p - 1))
                      }
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 transition enabled:hover:bg-white/10 disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <div className="flex flex-wrap justify-center gap-1">
                      {Array.from(
                        { length: activityTotalPages },
                        (_, i) => i + 1,
                      ).map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setActivityPage(n)}
                          className={`h-8 min-w-8 rounded-lg px-2 text-xs font-semibold transition ${
                            n === safeActivityPage
                              ? "bg-cyan-400 text-ink-950"
                              : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      disabled={safeActivityPage >= activityTotalPages}
                      onClick={() =>
                        setActivityPage((p) =>
                          Math.min(activityTotalPages, p + 1),
                        )
                      }
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 transition enabled:hover:bg-white/10 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </section>
        </>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {isMe ? (
          <Button variant="primary" href="/dashboard/profile" className="w-full">
            Edit my profile
          </Button>
        ) : (
          <Button variant="secondary" href="/dashboard/refer" className="w-full">
            Invite friends
          </Button>
        )}
        <Button variant="outline" href="/dashboard" className="w-full">
          Back to dashboard
        </Button>
      </div>

      <Link
        href="/dashboard/leaderboard"
        className="block text-center text-sm text-slate-500 hover:text-cyan-300"
      >
        See ranks →
      </Link>
    </div>
  );
}

function LockIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="5"
        y="11"
        width="14"
        height="10"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M8 11V8a4 4 0 018 0v3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}
