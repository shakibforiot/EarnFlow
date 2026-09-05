"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AdminShell, useAdmin } from "@/components/admin/AdminProvider";
import { Badge, MiniStat, Tiny } from "@/components/admin/AdminUI";
import { Button } from "@/components/Button";
import { formatCoins } from "@/data/dashboard";
import { ago } from "@/lib/admin-types";
import type { AdminUser } from "@/lib/admin-user";

export default function AdminUserDetailPage() {
  const params = useParams();
  const userId = String(params.id || "");
  const { api, flash, setError, busy } = useAdmin();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [sameIpUsers, setSameIpUsers] = useState<AdminUser[]>([]);
  const [sameIpCount, setSameIpCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [wallHistory, setWallHistory] = useState<{
    summary: {
      creditCount: number;
      chargebackCount: number;
      creditedCoins: number;
      reversedCoins: number;
      netCoins: number;
      risk: string;
    };
    chargebacks: { txid: string; coins: number; at: string }[];
    credits: { txid: string; coins: number; at: string }[];
  } | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const res = await api<{
      user?: AdminUser;
      sameIpUsers?: AdminUser[];
      sameIpCount?: number;
      wallHistory?: typeof wallHistory;
      error?: string;
    }>(`/api/admin/users?id=${encodeURIComponent(userId)}`);
    if (!res.ok || !res.data.user) {
      setError(res.data.error || "User not found");
      setUser(null);
      setWallHistory(null);
    } else {
      setUser(res.data.user);
      setSameIpUsers(res.data.sameIpUsers ?? []);
      setSameIpCount(res.data.sameIpCount ?? 0);
      setWallHistory(res.data.wallHistory ?? null);
    }
    setLoading(false);
  }, [api, userId, setError]);

  useEffect(() => {
    void load();
  }, [load]);

  async function action(
    actionName: string,
    extra: Record<string, unknown> = {},
  ) {
    if (!user) return;
    const res = await api<{ user?: AdminUser; error?: string; banned?: number }>(
      "/api/admin/users",
      {
        method: "PATCH",
        json: { userId: user.id, action: actionName, ...extra },
      },
    );
    if (!res.ok) {
      setError(res.data.error || "Action failed");
      return;
    }
    if (res.data.user) setUser(res.data.user);
    flash(
      actionName === "banIp"
        ? `Banned ${res.data.banned ?? 0} on IP`
        : `✓ ${actionName}`,
    );
    void load();
  }

  const ip = user ? user.lastIp || user.signupIp || "" : "";

  return (
    <AdminShell
      title={user?.name || "User"}
      subtitle={user?.email || "Ban · IP · full control"}
      actions={
        <>
          <Button size="sm" variant="outline" href="/admin/users">
            ← Users
          </Button>
          {user && (
            <Button
              size="sm"
              variant="secondary"
              href={`/dashboard/u/${user.id}`}
            >
              Public profile
            </Button>
          )}
        </>
      }
    >
      {loading ? (
        <p className="text-sm text-slate-500">Loading user…</p>
      ) : !user ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
          <p className="text-sm text-slate-400">User not found.</p>
          <Link href="/admin/users" className="mt-3 inline-block text-cyan-300">
            Back to users
          </Link>
        </div>
      ) : (
        <div className="animate-fade-up space-y-4">
          {/* Prominent ban bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
            <div>
              <p className="font-semibold text-red-100">Account control</p>
              <p className="text-xs text-red-200/70">
                Status: {user.accountStatus}
                {user.banReason ? ` · ${user.banReason}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {user.accountStatus !== "banned" ? (
                <Button
                  size="sm"
                  variant="primary"
                  className="!bg-red-500 !text-white hover:!bg-red-400"
                  onClick={() => {
                    const reason = window.prompt(
                      "Ban reason",
                      "Banned by admin",
                    );
                    if (reason == null) return;
                    void action("ban", { banReason: reason });
                  }}
                >
                  Ban user
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void action("unban")}
                >
                  Unban
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => void action("freeze")}
              >
                Freeze
              </Button>
              {ip && ip !== "unknown" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (
                      !window.confirm(
                        `Ban ALL accounts sharing IP ${ip}?`,
                      )
                    )
                      return;
                    void action("banIp", {
                      ip,
                      banReason: `Banned by admin (IP ${ip})`,
                    });
                  }}
                >
                  Ban entire IP
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <section className="space-y-4 rounded-2xl border border-white/10 bg-ink-900/60 p-5 lg:col-span-1">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-cyan-300">
                  Dossier
                </p>
                <h3 className="font-display text-2xl font-bold text-white">
                  {user.name}
                </h3>
                <p className="text-sm text-slate-400">{user.email}</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <MiniStat label="Balance" value={formatCoins(user.balance)} />
                <MiniStat label="Level" value={`Lv ${user.level}`} />
                <MiniStat label="Streak" value={`${user.streak}d`} />
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge
                  tone={
                    user.accountStatus === "banned"
                      ? "bad"
                      : user.accountStatus === "restricted"
                        ? "warn"
                        : "ok"
                  }
                >
                  {user.accountStatus}
                </Badge>
                <Badge tone={user.emailVerified ? "ok" : "warn"}>
                  {user.emailVerified ? "email ✓" : "email ✗"}
                </Badge>
                <Badge tone="info">{user.kycStatus}</Badge>
              </div>

              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-xs space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-cyan-300">
                  IP addresses
                </p>
                <p>
                  Signup IP:{" "}
                  <span className="font-mono text-white">
                    {user.signupIp || "—"}
                  </span>
                </p>
                <p>
                  Last IP:{" "}
                  <span className="font-mono text-white">
                    {user.lastIp || "—"}
                  </span>
                </p>
                <p>
                  Jila / District:{" "}
                  <span className="text-white">{user.district || "—"}</span>
                </p>
                <p className="text-slate-400">
                  Accounts on this IP:{" "}
                  <span
                    className={
                      sameIpCount > 1 ? "font-bold text-amber-300" : "text-emerald-300"
                    }
                  >
                    {sameIpCount || 1}
                  </span>
                  {sameIpCount > 1 && " ⚠ multi-account"}
                </p>
                {sameIpCount > 1 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => void action("enforceIp")}
                  >
                    Auto-ban extras (keep oldest)
                  </Button>
                )}
              </div>

              <div className="rounded-xl border border-white/10 bg-ink-950/50 p-3 text-xs text-slate-400 space-y-1">
                <p>
                  ID:{" "}
                  <span className="font-mono text-slate-300">{user.id}</span>
                </p>
                <p>Country: {user.country || "—"}</p>
                <p>Phone: {user.phone || "—"}</p>
                <p>PayPal: {user.paypalEmail || "—"}</p>
                <p>bKash: {user.bkashNumber || "—"}</p>
                <p>Nagad: {user.nagadNumber || "—"}</p>
                <p className="truncate">Crypto: {user.cryptoAddress || "—"}</p>
                <p>Member: {ago(user.memberSince)}</p>
                <p>Last login: {ago(user.lastLoginAt)}</p>
              </div>
            </section>

            <section className="space-y-5 rounded-2xl border border-white/10 bg-ink-900/60 p-5 lg:col-span-2">
              {sameIpUsers.length > 0 && (
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-amber-300/90">
                    Other accounts on same IP ({sameIpUsers.length})
                  </p>
                  <ul className="space-y-2">
                    {sameIpUsers.map((o) => (
                      <li
                        key={o.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-ink-950/50 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm text-white">{o.name}</p>
                          <p className="truncate text-[11px] text-slate-500">
                            {o.email}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            tone={
                              o.accountStatus === "banned"
                                ? "bad"
                                : o.accountStatus === "restricted"
                                  ? "warn"
                                  : "ok"
                            }
                          >
                            {o.accountStatus}
                          </Badge>
                          <Link
                            href={`/admin/users/${o.id}`}
                            className="text-[11px] text-cyan-300 hover:text-cyan-200"
                          >
                            Open
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {wallHistory && (
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Offerwall / fraud
                  </p>
                  <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <MiniStat
                      label="Credits"
                      value={String(wallHistory.summary.creditCount)}
                    />
                    <MiniStat
                      label="Chargebacks"
                      value={String(wallHistory.summary.chargebackCount)}
                    />
                    <MiniStat
                      label="Net"
                      value={formatCoins(wallHistory.summary.netCoins)}
                    />
                    <MiniStat
                      label="Risk"
                      value={wallHistory.summary.risk}
                    />
                  </div>
                  {wallHistory.chargebacks.length > 0 && (
                    <ul className="max-h-40 space-y-1 overflow-y-auto text-xs">
                      {wallHistory.chargebacks.map((c) => (
                        <li
                          key={c.txid + String(c.at)}
                          className="flex justify-between rounded-lg border border-red-500/20 bg-red-500/5 px-2 py-1.5"
                        >
                          <span className="truncate text-slate-400">
                            {c.txid.slice(0, 14)}…
                          </span>
                          <span className="text-red-300">
                            −{formatCoins(c.coins)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <Block title="Verification">
                <Tiny onClick={() => void action("verifyEmail")}>
                  Verify email
                </Tiny>
                <Tiny onClick={() => void action("unverifyEmail")}>
                  Unverify
                </Tiny>
                <Tiny onClick={() => void action("approveKyc")}>
                  KYC approve
                </Tiny>
                <Tiny warn onClick={() => void action("rejectKyc")}>
                  KYC reject
                </Tiny>
              </Block>

              <Block title="Profile locks">
                <div className="w-full space-y-1.5">
                  {(
                    [
                      ["email", "Email verify"],
                      ["country", "Country"],
                      ["phone", "Phone"],
                      ["payout", "Payout methods"],
                      ["kyc", "KYC"],
                    ] as const
                  ).map(([field, label]) => {
                    const unlocked = Boolean(user.adminUnlocks?.[field]);
                    return (
                      <div
                        key={field}
                        className="flex items-center justify-between rounded-lg bg-ink-950/40 px-3 py-2 text-xs"
                      >
                        <span className="text-slate-300">{label}</span>
                        <div className="flex items-center gap-1.5">
                          <Badge tone={unlocked ? "warn" : "ok"}>
                            {unlocked ? "unlocked" : "locked"}
                          </Badge>
                          {unlocked ? (
                            <Tiny
                              onClick={() =>
                                void action("lockField", { unlock: [field] })
                              }
                            >
                              Relock
                            </Tiny>
                          ) : (
                            <Tiny
                              onClick={() =>
                                void action("unlock", { unlock: [field] })
                              }
                            >
                              Unlock
                            </Tiny>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Tiny
                  warn
                  onClick={() => {
                    if (
                      !window.confirm(
                        "Unlock all checklist fields and clear locked data?",
                      )
                    )
                      return;
                    void action("unlockAll", { resetLockedFields: true });
                  }}
                >
                  Unlock all + reset
                </Tiny>
              </Block>

              <Block title="Economy">
                <Tiny
                  onClick={() => {
                    const bal = window.prompt(
                      "Set absolute balance",
                      String(user.balance),
                    );
                    if (bal == null) return;
                    void action("setBalance", { balance: Number(bal) });
                  }}
                >
                  Set balance
                </Tiny>
                <Tiny
                  onClick={() => {
                    const d = window.prompt(
                      "Add coins (negative to subtract)",
                      "100",
                    );
                    if (d == null) return;
                    void action("addBalance", { balance: Number(d) });
                  }}
                >
                  +/- coins
                </Tiny>
                <Tiny
                  onClick={() => {
                    const xp = window.prompt("Set XP", String(user.xp));
                    if (xp == null) return;
                    void action("setXp", { xp: Number(xp) });
                  }}
                >
                  Set XP
                </Tiny>
              </Block>

              <p className="text-[11px] text-slate-600">
                {busy ? "Working…" : "Changes save instantly."}
              </p>
            </section>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

function Block({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}
