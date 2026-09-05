"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { LiveFeed } from "@/components/LiveFeed";
import { formatCoins, formatUsd } from "@/data/dashboard";
import { clearSession, getSession, saveSession, type SessionUser } from "@/lib/session";
import { xpProgress } from "@/lib/xp";
import { coinsToUsd } from "@/lib/economy";
import { Footer } from "@/components/Footer";
import { NotificationBell } from "@/components/NotificationBell";

type NavItem = {
  href: string;
  label: string;
  icon: () => ReactNode;
};

const nav: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: HomeIcon },
  { href: "/dashboard/offers", label: "Offers", icon: WallIcon },
  { href: "/dashboard/surveys", label: "Surveys", icon: SurveyIcon },
  { href: "/dashboard/games", label: "Games", icon: GameIcon },
  { href: "/dashboard/redeem", label: "Redeem", icon: TicketIcon },
  { href: "/dashboard/cashout", label: "Cash Out", icon: CashIcon },
  { href: "/dashboard/leaderboard", label: "Ranks", icon: TrophyIcon },
  { href: "/dashboard/refer", label: "Refer", icon: ReferIcon },
  { href: "/dashboard/faucet", label: "Daily Free", icon: DropIcon },
  { href: "/dashboard/streak", label: "Streak", icon: StreakIcon },
  { href: "/dashboard/profile", label: "Profile", icon: ProfileIcon },
];

const mobilePrimary = [
  { href: "/dashboard", label: "Home", icon: HomeIcon },
  { href: "/dashboard/redeem", label: "Redeem", icon: TicketIcon },
  { href: "/dashboard/faucet", label: "Daily", icon: DropIcon },
  { href: "/dashboard/leaderboard", label: "Ranks", icon: TrophyIcon },
];

const moreEarn = [
  { href: "/dashboard/offers", label: "Offers", hint: "Tasks", icon: WallIcon },
  { href: "/dashboard/surveys", label: "Surveys", hint: "Opinion", icon: SurveyIcon },
  { href: "/dashboard/games", label: "Games", hint: "Play & earn", icon: GameIcon },
  { href: "/dashboard/faucet", label: "Daily Free", hint: "Faucet", icon: DropIcon },
  { href: "/dashboard/streak", label: "Streak", hint: "Daily bonus", icon: StreakIcon },
  { href: "/dashboard/redeem", label: "Redeem", hint: "Codes", icon: TicketIcon },
  { href: "/dashboard/cashout", label: "Cash Out", hint: "Withdraw", icon: CashIcon },
];

const moreAccount = [
  { href: "/dashboard/profile", label: "Profile", hint: "Security", icon: ProfileIcon },
  { href: "/dashboard/refer", label: "Refer", hint: "Invite", icon: ReferIcon },
  { href: "/dashboard/leaderboard", label: "Ranks", hint: "Top earners", icon: TrophyIcon },
];

const moreItems = [...moreEarn, ...moreAccount];

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    setUser(session);

    const sync = () => {
      const next = getSession();
      if (next) setUser(next);
    };

    async function refreshFromServer() {
      const current = getSession();
      if (!current) return;
      try {
        const res = await fetch(`/api/profile?userId=${current.id}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (res.ok && data.user) {
          if (
            data.user.accountStatus === "banned" ||
            data.user.accountStatus === "restricted"
          ) {
            clearSession();
            router.replace("/login");
            return;
          }
          saveSession(data.user);
          setUser(data.user);
        }
      } catch {
        /* keep local session */
      }
    }

    void refreshFromServer();
    window.addEventListener("focus", sync);
    window.addEventListener("earnflow-session", sync);
    return () => {
      window.removeEventListener("focus", sync);
      window.removeEventListener("earnflow-session", sync);
    };
  }, [router]);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [moreOpen]);

  function logout() {
    clearSession();
    router.push("/");
  }

  async function copyReferral() {
    if (!user) return;
    const code = user.referralCode || `EF${user.id.slice(-6).toUpperCase()}`;
    try {
      await navigator.clipboard.writeText(code);
      setCopiedRef(true);
      window.setTimeout(() => setCopiedRef(false), 1600);
    } catch {
      /* ignore */
    }
  }

  function isActive(href: string) {
    return href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(href);
  }

  const moreActive =
    moreOpen || moreItems.some((item) => isActive(item.href));
  const xpBar = xpProgress(user?.xp ?? 0);
  const refCode =
    user?.referralCode ||
    (user ? `EF${user.id.slice(-6).toUpperCase()}` : "");
  const verified = user?.emailVerified === true;

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950 text-sm text-slate-400">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-ink-950 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
      <header className="sticky top-0 z-40 border-b border-white/8 bg-ink-950/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-3 sm:h-16 sm:gap-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Logo href="/dashboard" />
            <span className="hidden rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-300 sm:inline">
              Earn
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <NotificationBell />
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-2 py-1.5 text-right sm:px-3">
              <p className="text-[9px] text-slate-500 sm:text-[10px]">Balance</p>
              <p className="max-w-[5.5rem] truncate text-xs font-bold text-cyan-300 sm:max-w-none sm:text-sm">
                {formatCoins(user.balance)}
                <span className="hidden text-xs font-medium text-slate-400 sm:inline">
                  {" "}
                  coins
                </span>
              </p>
            </div>
            <Link
              href="/dashboard/cashout"
              className="hidden h-9 items-center rounded-xl bg-cyan-400 px-3 text-sm font-semibold text-ink-950 hover:bg-cyan-300 md:inline-flex"
            >
              Cash Out
            </Link>
            <Link
              href="/dashboard/profile"
              title={user.email}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-emerald-500 text-xs font-bold text-ink-950"
            >
              {user.name.slice(0, 1).toUpperCase()}
            </Link>
          </div>
        </div>

        {/* Tablet horizontal nav */}
        <nav
          className="touch-scroll hidden border-t border-white/5 md:block lg:hidden"
          aria-label="Dashboard tablet"
        >
          <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-3 py-2 sm:px-6">
            {nav.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    active
                      ? "bg-cyan-400 text-ink-950"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      <LiveFeed />

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-4 px-3 py-4 sm:gap-6 sm:px-6 lg:py-6">
        <aside className="hidden w-52 shrink-0 xl:w-56 lg:block">
          <nav className="sticky top-24 space-y-1 rounded-2xl border border-white/10 bg-ink-900/60 p-2">
            {nav.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? "bg-cyan-400 text-ink-950"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <item.icon />
                  {item.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={logout}
              className="mt-2 flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-slate-500 hover:bg-white/5 hover:text-slate-300"
            >
              Log out
            </button>
          </nav>
        </aside>

        <main className="min-w-0 flex-1 animate-fade-up">{children}</main>
      </div>

      <Footer variant="compact" />

      {/* Mobile more sheet */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/75 backdrop-blur-[3px] animate-fade-in"
            aria-label="Close menu"
            onClick={() => setMoreOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Quick menu"
            className="animate-sheet-up absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-[1.75rem] border border-white/12 bg-gradient-to-b from-ink-800 via-ink-900 to-ink-950 p-4 pb-28 shadow-[0_-24px_70px_rgba(0,0,0,0.6)]"
          >
            <div
              className="pointer-events-none absolute -right-12 -top-4 h-40 w-40 rounded-full bg-cyan-500/25 blur-3xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -left-10 bottom-24 h-36 w-36 rounded-full bg-emerald-500/20 blur-3xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/[0.04] to-transparent"
              aria-hidden
            />

            <div className="relative mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/25" />

            {/* Account header */}
            <div className="relative mb-3 flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative shrink-0">
                  <div className="relative flex h-12 w-12 flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-400 to-emerald-500 shadow-lg shadow-cyan-500/30">
                    <div className="flex flex-1 items-center justify-center text-base font-bold text-ink-950">
                      {user.name.slice(0, 1).toUpperCase()}
                    </div>
                    <span className="bg-ink-950/90 py-px text-center text-[9px] font-bold tracking-wide text-cyan-300">
                      Lv {xpBar.level}
                    </span>
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {user.name}
                  </p>
                  <p className="truncate text-[11px] text-slate-400">
                    {formatCoins(user.balance)} coins ·{" "}
                    {formatUsd(coinsToUsd(user.balance))}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                        verified
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-amber-500/15 text-amber-300"
                      }`}
                    >
                      {verified ? "Verified" : "Unverified"}
                    </span>
                    <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[9px] font-semibold text-slate-400">
                      {user.streak}d streak
                    </span>
                    {user.profilePrivate ? (
                      <span className="rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-violet-200">
                        Private
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                aria-label="Close"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="relative mb-4">
              <div className="mb-1 flex items-center justify-between text-[10px] text-slate-500">
                <span>XP to level {xpBar.level + 1}</span>
                <span>
                  {xpBar.intoLevel}/{xpBar.need}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-500"
                  style={{ width: `${xpBar.pct}%` }}
                />
              </div>
            </div>

            {/* Shortcut CTAs */}
            <div className="relative mb-4 grid grid-cols-3 gap-2">
              {[
                {
                  href: "/dashboard/faucet",
                  label: "Daily Free",
                  className:
                    "border-cyan-400/35 bg-cyan-500/15 text-cyan-100",
                },
                {
                  href: "/dashboard/cashout",
                  label: "Cash Out",
                  className:
                    "border-emerald-400/30 bg-emerald-500/10 text-emerald-100",
                },
                {
                  href: "/dashboard/profile",
                  label: "Profile",
                  className: "border-white/12 bg-white/[0.04] text-slate-200",
                },
              ].map((cta) => (
                <Link
                  key={cta.href}
                  href={cta.href}
                  className={`rounded-xl border px-2 py-2.5 text-center text-[11px] font-semibold transition active:scale-[0.98] ${cta.className}`}
                >
                  {cta.label}
                </Link>
              ))}
            </div>

            <p className="relative mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Earn
            </p>
            <div className="relative mb-4 grid grid-cols-3 gap-2">
              {moreEarn.map((item, index) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{ animationDelay: `${index * 35}ms` }}
                    className={`animate-scale-in flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-center transition duration-200 active:scale-[0.97] ${
                      active
                        ? "border-cyan-400/50 bg-gradient-to-b from-cyan-500/25 to-cyan-500/5 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.12)]"
                        : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-cyan-400/25 hover:bg-white/[0.06] hover:text-white"
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                        active
                          ? "bg-cyan-400/20 text-cyan-300"
                          : "bg-ink-950/70 text-slate-300"
                      }`}
                    >
                      <item.icon />
                    </span>
                    <span className="text-[11px] font-semibold leading-tight">
                      {item.label}
                    </span>
                    <span className="text-[9px] font-medium text-slate-500">
                      {item.hint}
                    </span>
                  </Link>
                );
              })}
            </div>

            <p className="relative mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Account
            </p>
            <div className="relative mb-4 grid grid-cols-3 gap-2">
              {moreAccount.map((item, index) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{ animationDelay: `${(index + 6) * 35}ms` }}
                    className={`animate-scale-in flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-center transition duration-200 active:scale-[0.97] ${
                      active
                        ? "border-cyan-400/50 bg-gradient-to-b from-cyan-500/25 to-cyan-500/5 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.12)]"
                        : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-cyan-400/25 hover:bg-white/[0.06] hover:text-white"
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                        active
                          ? "bg-cyan-400/20 text-cyan-300"
                          : "bg-ink-950/70 text-slate-300"
                      }`}
                    >
                      <item.icon />
                    </span>
                    <span className="text-[11px] font-semibold leading-tight">
                      {item.label}
                    </span>
                    <span className="text-[9px] font-medium text-slate-500">
                      {item.hint}
                    </span>
                  </Link>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => void copyReferral()}
              className="relative mb-3 flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-ink-950/50 px-3.5 py-3 text-left transition hover:border-cyan-400/30"
            >
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  Referral code
                </p>
                <p className="mt-0.5 text-sm font-semibold text-cyan-300">
                  {refCode}
                </p>
              </div>
              <span className="rounded-lg bg-cyan-400/15 px-2.5 py-1 text-[11px] font-semibold text-cyan-200">
                {copiedRef ? "Copied" : "Copy"}
              </span>
            </button>

            <button
              type="button"
              onClick={logout}
              className="relative flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/25 bg-red-500/10 px-3 py-3.5 text-sm font-semibold text-red-200 transition hover:bg-red-500/15"
            >
              <LogoutIcon />
              Log out
            </button>
          </div>
        </div>
      )}

      {/* Mobile bottom nav */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-ink-950/90 shadow-[0_-8px_30px_rgba(0,0,0,0.35)] backdrop-blur-2xl md:hidden"
        aria-label="Dashboard mobile"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <ul className="mx-auto flex max-w-lg items-end justify-around px-1 pb-1.5 pt-1">
          {mobilePrimary.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  className={`flex flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-medium transition ${
                    active ? "text-cyan-300" : "text-slate-400"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-xl transition ${
                      active ? "bg-cyan-400/15 text-cyan-300" : ""
                    }`}
                  >
                    <item.icon />
                  </span>
                  {item.label}
                  {active && (
                    <span className="mt-0.5 h-1 w-1 rounded-full bg-cyan-400" />
                  )}
                </Link>
              </li>
            );
          })}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              aria-expanded={moreOpen}
              className="group relative flex w-full flex-col items-center gap-0.5 px-1 py-1 text-[10px] font-semibold"
            >
              <span
                className={`relative -mt-5 flex h-12 w-12 items-center justify-center rounded-2xl border transition duration-300 ${
                  moreOpen || moreActive
                    ? "border-cyan-300/60 bg-gradient-to-br from-cyan-400 to-emerald-400 text-ink-950 shadow-[0_8px_28px_rgba(34,211,238,0.45)]"
                    : "border-white/15 bg-ink-800 text-cyan-300 shadow-lg shadow-black/40 group-hover:border-cyan-400/40 group-hover:text-cyan-200"
                }`}
              >
                <span
                  className={`absolute inset-0 rounded-2xl bg-cyan-400/20 blur-md transition ${
                    moreOpen || moreActive ? "opacity-100" : "opacity-0"
                  }`}
                  aria-hidden
                />
                {moreOpen ? <CloseIcon /> : <GridMoreIcon />}
              </span>
              <span
                className={`mt-1 ${
                  moreOpen || moreActive ? "text-cyan-300" : "text-slate-400"
                }`}
              >
                {moreOpen ? "Close" : "More"}
              </span>
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}

function HomeIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 10.5L12 4l8 6.5V20a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-9.5z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}
function WallIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      <rect x="14" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      <rect x="3" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      <rect x="14" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}
function SurveyIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M8 7h8M8 12h8M8 17h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}
function GameIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 15c0-4 2.5-7 6-7s6 3 6 7l1.5 3H4.5L6 15z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <circle cx="9" cy="14" r="1" fill="currentColor" />
      <circle cx="15" cy="14" r="1" fill="currentColor" />
    </svg>
  );
}
function TicketIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 9a2 2 0 002-2V6a2 2 0 012-2h12a2 2 0 012 2v1a2 2 0 00-2 2 2 2 0 000 4 2 2 0 002 2v1a2 2 0 01-2 2H8a2 2 0 01-2-2v-1a2 2 0 00-2-2 2 2 0 010-4z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M10 8v8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeDasharray="2 3" />
    </svg>
  );
}
function CashIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}
function TrophyIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M8 4h8v5a4 4 0 01-8 0V4zM8 4H5v2a3 3 0 003 3M16 4h3v2a3 3 0 01-3 3M12 13v3M9 20h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function DropIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3s6 7 6 11a6 6 0 11-12 0c0-4 6-11 6-11z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}
function StreakIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3c2 3 5 5 5 9a5 5 0 11-10 0c0-2 1-4 2-5 1 2 2 2 3-1z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function ReferIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.7" />
      <path d="M3 19c0-3 2.5-5 6-5s6 2 6 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M17 11v6M14 14h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
function ProfileIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M5 19c0-3.5 3-6 7-6s7 2.5 7 6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}
function GridMoreIcon() {
  return (
    <svg className="relative h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="4" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="14" y="4" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="4" y="14" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="14" y="14" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg className="relative h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 7l10 10M17 7L7 17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M10 7V5a2 2 0 012-2h7v18h-7a2 2 0 01-2-2v-2M15 12H4m0 0l3-3m-3 3l3 3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
