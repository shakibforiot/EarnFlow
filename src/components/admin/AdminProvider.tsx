"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { useAuthModal } from "@/components/auth/AuthProvider";
import { getSession, type SessionUser } from "@/lib/session";
import { Footer } from "@/components/Footer";
import {
  ADMIN_NAV,
  ADMIN_SECRET_KEY,
  adminHeaders,
  ago,
  type AdminSettings,
  type AdminStats,
} from "@/lib/admin-types";

type AdminCtx = {
  secret: string;
  adminUserId: string;
  authed: boolean;
  busy: boolean;
  settings: AdminSettings | null;
  stats: AdminStats | null;
  note: string;
  error: string;
  lastSync: Date | null;
  autoRefresh: boolean;
  setAutoRefresh: (v: boolean) => void;
  flash: (msg: string) => void;
  setError: (msg: string) => void;
  loadCore: () => Promise<void>;
  patchSettings: (patch: Partial<AdminSettings>) => Promise<boolean>;
  api: <T = unknown>(
    path: string,
    init?: RequestInit & { json?: unknown },
  ) => Promise<{ ok: boolean; status: number; data: T }>;
  logout: () => void;
};

const Ctx = createContext<AdminCtx | null>(null);

export function useAdmin() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAdmin must be used inside AdminProvider");
  return ctx;
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const { openAuth } = useAuthModal();
  const [secret, setSecret] = useState("");
  const [adminUserId, setAdminUserId] = useState("");
  const [session, setSession] = useState<SessionUser | null>(null);
  const [authed, setAuthed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [gateMsg, setGateMsg] = useState("");
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [boot, setBoot] = useState(false);

  useEffect(() => {
    try {
      setSecret(window.localStorage.getItem(ADMIN_SECRET_KEY) || "");
    } catch {
      /* ignore */
    }
    const sync = () => setSession(getSession());
    sync();
    window.addEventListener("earnflow-session", sync);
    setBoot(true);
    return () => window.removeEventListener("earnflow-session", sync);
  }, []);

  const flash = useCallback((msg: string) => {
    setNote(msg);
    setError("");
    window.setTimeout(() => setNote(""), 2800);
  }, []);

  const authHeaders = useCallback(() => {
    const h: Record<string, string> = { ...adminHeaders(secret) };
    if (adminUserId) h["x-admin-user-id"] = adminUserId;
    return h;
  }, [secret, adminUserId]);

  const api = useCallback(
    async <T = unknown>(
      path: string,
      init?: RequestInit & { json?: unknown },
    ) => {
      const headers = {
        ...authHeaders(),
        ...(init?.headers || {}),
      };
      const res = await fetch(path, {
        ...init,
        headers,
        body:
          init?.json !== undefined
            ? JSON.stringify({
                ...(typeof init.json === "object" && init.json
                  ? init.json
                  : {}),
                adminSecret: secret || undefined,
                adminUserId: adminUserId || undefined,
              })
            : init?.body,
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as T;
      if (res.status === 401 || res.status === 403) {
        setAuthed(false);
        setError(
          (data as { error?: string }).error ||
            "Unauthorized — login as admin",
        );
      }
      return { ok: res.ok, status: res.status, data };
    },
    [authHeaders, secret, adminUserId],
  );

  const loadCore = useCallback(async () => {
    if (!adminUserId && !secret) return;
    setBusy(true);
    try {
      const headers = authHeaders();
      const [sRes, stRes] = await Promise.all([
        fetch("/api/admin/settings", { headers, cache: "no-store" }),
        fetch("/api/admin/stats", { headers, cache: "no-store" }),
      ]);
      if (sRes.status === 401 || stRes.status === 401 || stRes.status === 403) {
        setAuthed(false);
        setError("Unauthorized");
        return;
      }
      // settings GET is public — stats requires admin
      if (stRes.ok) {
        setStats(await stRes.json());
        setAuthed(true);
      }
      if (sRes.ok) setSettings(await sRes.json());
      setLastSync(new Date());
      setError("");
    } catch {
      setError("Failed to sync admin data");
    } finally {
      setBusy(false);
    }
  }, [adminUserId, secret, authHeaders]);

  /** Must be logged in first; then ADMIN_EMAIL/role or ADMIN_SECRET */
  useEffect(() => {
    if (!boot) return;
    let cancelled = false;
    (async () => {
      const s = getSession();
      setSession(s);
      if (!s?.id) {
        setAuthed(false);
        setAdminUserId("");
        setGateMsg("login");
        return;
      }

      setBusy(true);
      try {
        const res = await fetch(
          `/api/admin/access?userId=${encodeURIComponent(s.id)}`,
          {
            headers: { "x-admin-user-id": s.id },
            cache: "no-store",
          },
        );
        const data = await res.json();
        if (cancelled) return;

        if (res.ok && data.ok) {
          setAdminUserId(s.id);
          setAuthed(true);
          setGateMsg("");
          flash("Admin unlocked");
          return;
        }

        // Not admin by email — allow ADMIN_SECRET while logged in
        const saved = window.localStorage.getItem(ADMIN_SECRET_KEY) || "";
        if (saved) {
          const probe = await fetch("/api/admin/stats", {
            headers: {
              "x-admin-secret": saved,
              "x-admin-user-id": s.id,
            },
            cache: "no-store",
          });
          if (probe.ok) {
            setSecret(saved);
            setAdminUserId(s.id);
            setAuthed(true);
            setGateMsg("");
            return;
          }
        }

        setAuthed(false);
        setAdminUserId(s.id);
        setGateMsg("secret");
        setError(
          data.error ||
            "Logged in, but this account is not admin. Enter ADMIN_SECRET or set ADMIN_EMAIL.",
        );
      } catch {
        if (!cancelled) {
          setGateMsg("login");
          setError("Could not verify admin access");
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [boot, flash]);

  useEffect(() => {
    if (authed) void loadCore();
  }, [authed, loadCore]);

  useEffect(() => {
    if (!authed || !autoRefresh) return;
    const id = window.setInterval(() => void loadCore(), 30000);
    return () => window.clearInterval(id);
  }, [authed, autoRefresh, loadCore]);

  const patchSettings = useCallback(
    async (patch: Partial<AdminSettings>) => {
      setBusy(true);
      try {
        const res = await api<{ settings?: AdminSettings; error?: string }>(
          "/api/admin/settings",
          { method: "PATCH", json: patch },
        );
        if (!res.ok) {
          setError(
            (res.data as { error?: string }).error || "Save failed",
          );
          return false;
        }
        if (res.data.settings) setSettings(res.data.settings);
        else await loadCore();
        flash("Settings saved");
        return true;
      } catch {
        setError("Save failed");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [api, flash, loadCore],
  );

  const unlockWithSecret = async (e: FormEvent) => {
    e.preventDefault();
    if (!session?.id) {
      setGateMsg("login");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/stats", {
        headers: {
          "x-admin-secret": secret,
          "x-admin-user-id": session.id,
        },
        cache: "no-store",
      });
      if (!res.ok) {
        setError("Wrong ADMIN_SECRET");
        return;
      }
      window.localStorage.setItem(ADMIN_SECRET_KEY, secret);
      setAdminUserId(session.id);
      setAuthed(true);
      setGateMsg("");
      flash("Control room unlocked");
    } catch {
      setError("Unlock failed");
    } finally {
      setBusy(false);
    }
  };

  const logout = () => {
    window.localStorage.removeItem(ADMIN_SECRET_KEY);
    setSecret("");
    setAuthed(false);
    setGateMsg(session ? "secret" : "login");
  };

  const value = useMemo(
    () => ({
      secret,
      adminUserId,
      authed,
      busy,
      settings,
      stats,
      note,
      error,
      lastSync,
      autoRefresh,
      setAutoRefresh,
      flash,
      setError,
      loadCore,
      patchSettings,
      api,
      logout,
    }),
    [
      secret,
      adminUserId,
      authed,
      busy,
      settings,
      stats,
      note,
      error,
      lastSync,
      autoRefresh,
      flash,
      loadCore,
      patchSettings,
      api,
    ],
  );

  if (!boot) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        Loading admin…
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(6,182,212,0.18),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(16,185,129,0.12),_transparent_45%)]"
          aria-hidden
        />
        <div className="animate-scale-in relative w-full max-w-md space-y-4 rounded-3xl border border-white/10 bg-ink-900/80 p-6 shadow-2xl shadow-cyan-500/10 backdrop-blur-xl">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300">
              EarnFlow · Ops
            </p>
            <h1 className="mt-1 font-display text-3xl font-bold text-white">
              Control room
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              {gateMsg === "login" || !session
                ? "Pehle site-e user login koro. Login chara /admin open hobe na."
                : "Logged in — admin email hole auto unlock. Noyto ADMIN_SECRET dao."}
            </p>
          </div>

          {session && (
            <p className="rounded-xl border border-white/10 bg-ink-950/60 px-3 py-2 text-xs text-slate-300">
              Session: <span className="text-cyan-200">{session.email}</span>
            </p>
          )}

          {(!session || gateMsg === "login") && (
            <div className="space-y-2">
              <Button
                type="button"
                variant="primary"
                className="w-full"
                onClick={() => openAuth("login")}
              >
                Sign in first
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setSession(getSession());
                  window.location.reload();
                }}
              >
                I already logged in — retry
              </Button>
            </div>
          )}

          {session && gateMsg === "secret" && (
            <form onSubmit={unlockWithSecret} className="space-y-3">
              <input
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="ADMIN_SECRET"
                className="h-11 w-full rounded-xl border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none focus:border-cyan-400/40"
              />
              <Button type="submit" variant="primary" className="w-full" disabled={busy}>
                {busy ? "Checking…" : "Unlock with secret"}
              </Button>
            </form>
          )}

          {error && (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          )}
          <Link
            href="/"
            className="block text-center text-sm text-slate-500 hover:text-slate-300"
          >
            ← Back to site
          </Link>
        </div>
      </div>
    );
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function AdminShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    busy,
    settings,
    note,
    error,
    lastSync,
    autoRefresh,
    setAutoRefresh,
    loadCore,
    logout,
    stats,
  } = useAdmin();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      const idx = Number(e.key) - 1;
      if (idx >= 0 && idx < ADMIN_NAV.length) {
        router.push(ADMIN_NAV[idx].href);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  const pending = stats?.cashouts.pending ?? 0;
  const chatWaiting = stats?.support?.waiting ?? 0;

  function navActive(href: string, exact?: boolean) {
    return exact
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_0%_0%,_rgba(6,182,212,0.12),_transparent_40%),radial-gradient(ellipse_at_100%_0%,_rgba(245,158,11,0.08),_transparent_35%)]"
        aria-hidden
      />

      {/* One shared top navbar for the whole admin */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-ink-950/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link href="/admin" className="shrink-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
              EarnFlow
            </p>
            <p className="font-display text-lg font-bold leading-tight text-white">
              Admin
            </p>
          </Link>

          <nav className="ml-2 hidden min-w-0 flex-1 flex-wrap items-center gap-1 xl:flex">
            {ADMIN_NAV.map((item) => {
              const active = navActive(item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`shrink-0 rounded-lg px-2 py-1.5 text-[12px] font-medium transition 2xl:px-3 2xl:text-sm ${
                    active
                      ? "bg-cyan-400 text-ink-950"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {item.label}
                  {item.href === "/admin/cashouts" && pending > 0 && (
                    <span
                      className={`ml-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                        active
                          ? "bg-ink-950/20 text-ink-950"
                          : "bg-amber-500/20 text-amber-200"
                      }`}
                    >
                      {pending}
                    </span>
                  )}
                  {item.href === "/admin/chat" && chatWaiting > 0 && (
                    <span
                      className={`ml-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                        active
                          ? "bg-ink-950/20 text-ink-950"
                          : "bg-emerald-500/20 text-emerald-200"
                      }`}
                    >
                      {chatWaiting}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            {settings?.maintenanceMode && (
              <span className="hidden rounded-md bg-amber-500/15 px-2 py-1 text-[10px] font-semibold text-amber-200 sm:inline">
                Maintenance
              </span>
            )}
            {settings?.forceErrorMode && (
              <span className="hidden rounded-md bg-red-500/15 px-2 py-1 text-[10px] font-semibold text-red-200 sm:inline">
                500 ON
              </span>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="hidden sm:inline-flex"
              onClick={() => void loadCore()}
              disabled={busy}
            >
              {busy ? "…" : "Sync"}
            </Button>
            <Button size="sm" variant="outline" href="/" className="hidden sm:inline-flex">
              Site
            </Button>
            <Button size="sm" variant="ghost" onClick={logout} className="hidden sm:inline-flex">
              Lock
            </Button>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-white xl:hidden"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Menu"
            >
              {menuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="border-t border-white/10 bg-ink-900/95 px-4 py-3 xl:hidden">
            <div className="flex flex-col gap-1">
              {ADMIN_NAV.map((item) => {
                const active = navActive(item.href, item.exact);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`rounded-xl px-3 py-2.5 text-sm font-medium ${
                      active
                        ? "bg-cyan-400 text-ink-950"
                        : "text-slate-300 hover:bg-white/5"
                    }`}
                  >
                    {item.label}
                    <span className="ml-2 text-[11px] opacity-60">{item.hint}</span>
                  </Link>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-2 border-t border-white/5 pt-3">
              <Button size="sm" variant="secondary" onClick={() => void loadCore()}>
                Sync
              </Button>
              <Button size="sm" variant="outline" href="/">
                Site
              </Button>
              <Button size="sm" variant="ghost" onClick={logout}>
                Lock
              </Button>
              <label className="flex items-center gap-2 text-[11px] text-slate-400">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
                Auto 30s
              </label>
            </div>
          </div>
        )}
      </header>

      <div className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col space-y-4 px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
                {title}
              </h1>
              {busy && (
                <span className="animate-pulse text-[11px] text-cyan-300">
                  Syncing…
                </span>
              )}
            </div>
            {subtitle && (
              <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
            )}
            <p className="mt-1 text-[11px] text-slate-500">
              Sync {lastSync ? ago(lastSync.toISOString()) : "—"}
              <span className="ml-2 hidden md:inline">· Keys jump pages</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {actions}
            <label className="hidden items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-[11px] text-slate-400 md:flex">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Auto-sync
            </label>
          </div>
        </div>

        {(note || error) && (
          <div
            className={`animate-fade-in rounded-2xl border px-4 py-3 text-sm ${
              error
                ? "border-red-500/30 bg-red-500/10 text-red-200"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
            }`}
          >
            {error || note}
          </div>
        )}

        {children}
      </div>
      <Footer variant="compact" />
    </div>
  );
}
