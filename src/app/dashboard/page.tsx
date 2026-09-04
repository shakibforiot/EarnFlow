"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatCoins, type DailyTask } from "@/data/dashboard";
import {
  OfferCard,
  SectionHeader,
} from "@/components/dashboard/OfferCard";
import { DashboardWelcome } from "@/components/dashboard/DashboardWelcome";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/Button";
import { getSession, saveSession } from "@/lib/session";
import { getCompletenessItems } from "@/lib/profile-complete";
import { useSiteCatalog } from "@/hooks/useSiteCatalog";

type TaskRow = DailyTask & {
  done: boolean;
  eligible: boolean;
  canClaim: boolean;
};

type RecentEarn = {
  id: string;
  source: string;
  coins: number;
  createdAt: string;
};

function formatWait(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function DashboardHomePage() {
  const catalog = useSiteCatalog();
  const offers = catalog.offers;
  const faucetCoins = catalog.faucetCoins;
  const featured = offers.filter((o) => o.featured);
  const topGames = [...offers]
    .filter((o) => o.category === "game")
    .sort((a, b) => b.reward - a.reward)
    .slice(0, 4);
  const surveys = (
    catalog.surveys.length
      ? catalog.surveys
      : offers.filter((o) => o.category === "survey")
  ).slice(0, 4);

  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [faucetClaimCoins, setFaucetClaimCoins] = useState(100);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [streak, setStreak] = useState({
    streak: 0,
    claimedToday: false,
    nextReward: 10,
  });
  const [taskMsg, setTaskMsg] = useState("");
  const [recent, setRecent] = useState<RecentEarn[]>([]);
  const [profileScore, setProfileScore] = useState(0);
  const [profileScoreMax, setProfileScoreMax] = useState(5);
  const [cashoutProgress, setCashoutProgress] = useState(0);
  const [faucetReady, setFaucetReady] = useState(false);
  const [faucetWait, setFaucetWait] = useState(0);
  const [claimingFaucet, setClaimingFaucet] = useState(false);

  const [sessionUser, setSessionUser] = useState(() =>
    typeof window !== "undefined" ? getSession() : null,
  );

  useEffect(() => {
    const sync = () => setSessionUser(getSession());
    sync();
    window.addEventListener("earnflow-session", sync);
    return () => window.removeEventListener("earnflow-session", sync);
  }, []);

  const checklist = useMemo(
    () => getCompletenessItems(sessionUser),
    [sessionUser],
  );
  const todosLeft = checklist.filter((c) => !c.done).length;

  async function refreshMeta() {
    const s = getSession();
    if (!s) return;
    try {
      const [cRes, tRes, sRes, pRes, fRes] = await Promise.all([
        fetch(`/api/offers/complete?userId=${s.id}`, { cache: "no-store" }),
        fetch(`/api/tasks?userId=${s.id}`, { cache: "no-store" }),
        fetch(`/api/streak?userId=${s.id}`, { cache: "no-store" }),
        fetch(`/api/profile?userId=${s.id}`, { cache: "no-store" }),
        fetch(`/api/faucet?userId=${s.id}`, { cache: "no-store" }),
      ]);
      if (cRes.ok) {
        const data = await cRes.json();
        setCompleted(new Set(data.completed ?? []));
      }
      if (tRes.ok) {
        const data = await tRes.json();
        setTasks(data.tasks ?? []);
      }
      if (sRes.ok) {
        const data = await sRes.json();
        setStreak({
          streak: data.streak ?? 0,
          claimedToday: Boolean(data.claimedToday),
          nextReward: data.nextReward ?? 10,
        });
      }
      if (pRes.ok) {
        const data = await pRes.json();
        if (data.user) {
          saveSession(data.user);
          window.dispatchEvent(new Event("earnflow-session"));
        }
        setRecent((data.offers ?? []).slice(0, 5));
        setProfileScore(data.summary?.profileScore ?? 0);
        setProfileScoreMax(data.summary?.profileScoreMax ?? 5);
        setCashoutProgress(data.summary?.cashoutProgress ?? 0);
      }
      if (fRes.ok) {
        const data = await fRes.json();
        setFaucetReady(Boolean(data.ready));
        setFaucetWait(Number(data.waitSec) || 0);
        if (data.coins) setFaucetClaimCoins(Number(data.coins));
      }
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    void refreshMeta();
  }, []);

  useEffect(() => {
    if (faucetReady || faucetWait <= 0) return;
    const t = window.setInterval(() => {
      setFaucetWait((w) => {
        if (w <= 1) {
          setFaucetReady(true);
          return 0;
        }
        return w - 1;
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, [faucetReady, faucetWait]);

  async function claimTask(taskId: string) {
    const s = getSession();
    if (!s) return;
    setTaskMsg("");
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: s.id, taskId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTaskMsg(data.error || "Could not claim task.");
        return;
      }
      saveSession(data.user);
      window.dispatchEvent(new Event("earnflow-session"));
      setTaskMsg(`+${data.coins} coins from daily task`);
      void refreshMeta();
    } catch {
      setTaskMsg("Could not claim task.");
    }
  }

  async function claimStreak() {
    const s = getSession();
    if (!s) return;
    setTaskMsg("");
    try {
      const res = await fetch("/api/streak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: s.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTaskMsg(data.error || "Streak claim failed.");
        return;
      }
      saveSession(data.user);
      window.dispatchEvent(new Event("earnflow-session"));
      setTaskMsg(`Streak day ${data.streak}! +${data.coins} coins`);
      void refreshMeta();
    } catch {
      setTaskMsg("Streak claim failed.");
    }
  }

  async function claimFaucet() {
    const s = getSession();
    if (!s || !faucetReady || claimingFaucet) return;
    setClaimingFaucet(true);
    setTaskMsg("");
    try {
      const res = await fetch("/api/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: s.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTaskMsg(data.error || "Faucet claim failed.");
        if (typeof data.waitSec === "number") {
          setFaucetReady(false);
          setFaucetWait(data.waitSec);
        }
        return;
      }
      if (data.user) {
        saveSession(data.user);
        window.dispatchEvent(new Event("earnflow-session"));
      }
      setTaskMsg(`Daily Free claimed · +${data.coins ?? 100} coins`);
      setFaucetReady(false);
      setFaucetWait(data.waitSec ?? 30 * 60);
      void refreshMeta();
    } catch {
      setTaskMsg("Faucet claim failed.");
    } finally {
      setClaimingFaucet(false);
    }
  }

  const paths = [
    {
      href: "/dashboard/faucet",
      label: "Daily Free",
      desc: faucetReady
        ? `${faucetClaimCoins || faucetCoins} coins ready`
        : `Wait ${formatWait(faucetWait)}`,
      accent: "from-cyan-500/20 to-transparent",
    },
    {
      href: "/dashboard/offers",
      label: "Offers",
      desc: offers.length ? `${offers.length} live` : "Browse tasks",
      accent: "from-emerald-500/20 to-transparent",
    },
    {
      href: "/dashboard/refer",
      label: "Referrals",
      desc: "Invite & earn bonus",
      accent: "from-sky-500/20 to-transparent",
    },
    {
      href: "/dashboard/profile",
      label: "Profile",
      desc:
        todosLeft > 0 ? `${todosLeft} steps left` : "Account fully ready",
      accent: "from-teal-500/20 to-transparent",
    },
  ];

  return (
    <div className="space-y-8">
      <DashboardWelcome
        offerCount={offers.length}
        profileScore={profileScore}
        profileScoreMax={profileScoreMax}
        cashoutProgress={cashoutProgress}
        faucetReady={faucetReady}
        faucetWaitSec={faucetWait}
      />

      {taskMsg && (
        <p className="animate-fade-in rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          {taskMsg}
        </p>
      )}

      <section className="grid gap-3 lg:grid-cols-3">
        <div className="animate-fade-up relative overflow-hidden rounded-3xl border border-cyan-400/25 bg-gradient-to-br from-cyan-500/15 via-ink-900 to-ink-900 p-5 lg:col-span-1">
          <p className="text-xs font-medium uppercase tracking-wide text-cyan-200/80">
            Daily Free faucet
          </p>
          <p className="mt-2 font-display text-3xl font-bold text-white">
            {faucetReady
              ? formatCoins(faucetClaimCoins || faucetCoins)
              : formatWait(faucetWait)}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {faucetReady
              ? "Coins ready to claim right now"
              : "Cooldown until next free claim"}
          </p>
          <Button
            className="mt-4"
            size="sm"
            variant="primary"
            disabled={!faucetReady || claimingFaucet}
            onClick={() => void claimFaucet()}
          >
            {claimingFaucet
              ? "Claiming…"
              : faucetReady
                ? `Claim ${faucetClaimCoins || faucetCoins} coins`
                : "On cooldown"}
          </Button>
          <Link
            href="/dashboard/faucet"
            className="mt-3 block text-xs text-cyan-300/80 hover:text-cyan-200"
          >
            Open faucet page →
          </Link>
        </div>

        <div className="animate-fade-up rounded-3xl border border-white/10 bg-ink-900/70 p-5 lg:col-span-1">
          <p className="text-xs text-slate-400">Login streak</p>
          <p className="mt-1 font-display text-3xl font-bold text-white">
            {streak.streak}
            <span className="ml-1 text-base font-medium text-slate-400">
              days
            </span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Next bonus: {streak.nextReward} coins
          </p>
          <Button
            className="mt-4"
            size="sm"
            variant={streak.claimedToday ? "secondary" : "primary"}
            disabled={streak.claimedToday}
            onClick={() => void claimStreak()}
          >
            {streak.claimedToday ? "Claimed today" : "Claim streak"}
          </Button>
        </div>

        <div className="animate-fade-up rounded-3xl border border-white/10 bg-ink-900/70 p-5 lg:col-span-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-slate-400">Account readiness</p>
            <Link
              href="/dashboard/profile"
              className="text-[11px] font-medium text-cyan-300 hover:text-cyan-200"
            >
              Fix profile
            </Link>
          </div>
          <p className="mt-1 font-display text-3xl font-bold text-white">
            {profileScore}
            <span className="text-base font-medium text-slate-400">
              /{profileScoreMax}
            </span>
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all"
              style={{
                width: `${Math.round((profileScore / Math.max(1, profileScoreMax)) * 100)}%`,
              }}
            />
          </div>
          <ul className="mt-3 space-y-1.5">
            {checklist.slice(0, 3).map((item) => (
              <li
                key={item.key}
                className="flex justify-between gap-2 text-[11px]"
              >
                <span className="truncate text-slate-400">{item.label}</span>
                <span
                  className={
                    item.done ? "text-emerald-300" : "text-amber-300"
                  }
                >
                  {item.done ? "Done" : "Todo"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section>
        <SectionHeader title="Earn paths" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {paths.map((item, i) => (
            <Link
              key={item.href}
              href={item.href}
              className={`animate-fade-up relative overflow-hidden rounded-2xl border border-white/10 bg-ink-900/60 p-4 transition hover:border-cyan-400/35`}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div
                className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${item.accent}`}
                aria-hidden
              />
              <p className="relative font-semibold text-white">{item.label}</p>
              <p className="relative mt-1 text-xs text-slate-400">{item.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="Daily tasks" href="/dashboard/faucet" action="Faucet" />
        <div className="grid gap-2 sm:grid-cols-2">
          {(tasks.length
            ? tasks
            : [
                {
                  id: "task-faucet",
                  title: "Claim Daily Free coins",
                  description: "Use the faucet at least once today.",
                  reward: 25,
                  kind: "faucet" as const,
                  done: false,
                  eligible: false,
                  canClaim: false,
                },
              ]
          ).map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-ink-900/60 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-white">{task.title}</p>
                <p className="text-xs text-slate-500">
                  +{task.reward} coins
                  {"description" in task && task.description
                    ? ` · ${task.description}`
                    : ""}
                </p>
              </div>
              <button
                type="button"
                disabled={!task.canClaim}
                onClick={() => void claimTask(task.id)}
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                  task.done
                    ? "bg-emerald-500/15 text-emerald-300"
                    : task.canClaim
                      ? "bg-cyan-400 text-ink-950 hover:bg-cyan-300"
                      : "bg-white/5 text-slate-400"
                }`}
              >
                {task.done ? "Done" : task.canClaim ? "Claim" : "Locked"}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-white/10 bg-ink-900/60 p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-white">Recent earnings</h2>
            <Link
              href="/dashboard/profile"
              className="text-xs text-cyan-300 hover:text-cyan-200"
            >
              Full history
            </Link>
          </div>
          {!recent.length ? (
            <p className="mt-4 text-sm text-slate-500">
              No earnings yet — claim Daily Free or finish a task to start your
              ledger.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {recent.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-ink-950/40 px-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{row.source}</p>
                    <p className="text-[11px] text-slate-500">
                      {new Date(row.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-cyan-300">
                    +{formatCoins(row.coins)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-ink-900 to-ink-950 p-5">
          <h2 className="text-lg font-bold text-white">Cash out runway</h2>
          <p className="mt-1 text-sm text-slate-400">
            Reach $5 balance to unlock safer withdrawals.
          </p>
          <div className="mt-5 flex items-center justify-center">
            <div
              className="relative flex h-28 w-28 items-center justify-center rounded-full"
              style={{
                background: `conic-gradient(#22d3ee ${Math.min(100, cashoutProgress)}%, rgba(255,255,255,0.08) 0)`,
              }}
            >
              <div className="flex h-[5.5rem] w-[5.5rem] flex-col items-center justify-center rounded-full bg-ink-950">
                <span className="text-xl font-bold text-white">
                  {Math.min(100, Math.round(cashoutProgress))}%
                </span>
                <span className="text-[10px] text-slate-500">to $5</span>
              </div>
            </div>
          </div>
          <Button className="mt-5 w-full" variant="secondary" href="/dashboard/cashout">
            Open cash out
          </Button>
        </div>
      </section>

      <section>
        <SectionHeader title="Featured offers" href="/dashboard/offers" />
        {featured.length === 0 ? (
          <EmptyState
            title="No featured offers yet"
            description="When admin adds offers in Catalog, they show up here. Use Daily Free and referrals meanwhile."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {featured.map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                completed={completed.has(offer.id)}
                onCompleted={(id) => {
                  setCompleted((prev) => new Set([...prev, id]));
                  void refreshMeta();
                }}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionHeader title="Highest paying games" href="/dashboard/games" />
        {topGames.length === 0 ? (
          <EmptyState
            title="Game offers pending"
            description="High-paying playtime offers show up here when the games catalog is live."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {topGames.map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                completed={completed.has(offer.id)}
                onCompleted={(id) => {
                  setCompleted((prev) => new Set([...prev, id]));
                  void refreshMeta();
                }}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionHeader title="Surveys" href="/dashboard/surveys" />
        {surveys.length === 0 ? (
          <EmptyState
            title="Surveys pending"
            description="Survey partners will populate this section once integrations are added."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {surveys.map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                completed={completed.has(offer.id)}
                onCompleted={(id) => {
                  setCompleted((prev) => new Set([...prev, id]));
                  void refreshMeta();
                }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
