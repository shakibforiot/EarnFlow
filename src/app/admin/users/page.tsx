"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AdminShell, useAdmin } from "@/components/admin/AdminProvider";
import { Badge, Tiny, adminInput } from "@/components/admin/AdminUI";
import { Button } from "@/components/Button";
import { formatCoins } from "@/data/dashboard";
import type { AdminUser } from "@/lib/admin-user";

export default function AdminUsersPage() {
  const { api, flash, setError, busy } = useAdmin();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api<{ users?: AdminUser[]; error?: string }>(
      `/api/admin/users?q=${encodeURIComponent(q)}&status=${filter}`,
    );
    if (!res.ok) {
      setError(res.data.error || "Failed to load users");
    } else {
      setUsers(res.data.users ?? []);
    }
    setLoading(false);
  }, [api, q, filter, setError]);

  useEffect(() => {
    void load();
  }, [load]);

  async function quickBan(u: AdminUser) {
    const reason = window.prompt(
      `Ban ${u.name}?`,
      u.banReason || "Banned by admin",
    );
    if (reason == null) return;
    const res = await api<{ error?: string }>("/api/admin/users", {
      method: "PATCH",
      json: { userId: u.id, action: "ban", banReason: reason },
    });
    if (!res.ok) {
      setError(res.data.error || "Ban failed");
      return;
    }
    flash(`Banned ${u.name}`);
    void load();
  }

  async function banIp(ip: string) {
    if (!ip || ip === "unknown") return;
    if (
      !window.confirm(
        `Ban ALL accounts on IP ${ip}? (same IP multi-account wipe)`,
      )
    )
      return;
    const res = await api<{ banned?: number; error?: string }>(
      "/api/admin/users",
      {
        method: "PATCH",
        json: {
          action: "banIp",
          ip,
          banReason: `Banned by admin (IP ${ip})`,
        },
      },
    );
    if (!res.ok) {
      setError(res.data.error || "IP ban failed");
      return;
    }
    flash(`Banned ${res.data.banned ?? 0} account(s) on ${ip}`);
    void load();
  }

  return (
    <AdminShell
      title="Users"
      subtitle="Ban users, view IPs — 1 IP = 1 account (2nd account auto-banned)"
      actions={
        <Button
          size="sm"
          variant="outline"
          onClick={() => void load()}
          disabled={busy || loading}
        >
          Reload
        </Button>
      }
    >
      <div className="animate-fade-up space-y-4">
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-100/90">
          Rule: same IP দিয়ে ২টা account create করলে নতুন account ban হবে।
          Admin থেকেও manual ban / Ban IP করা যাবে।
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void load()}
            placeholder="Search name, email, or IP…"
            className={`${adminInput} max-w-md flex-1`}
          />
          <Button size="sm" variant="secondary" onClick={() => void load()}>
            Search
          </Button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["all", "All"],
              ["active", "Active"],
              ["banned", "Banned"],
              ["restricted", "Frozen"],
              ["unverified", "Unverified"],
              ["kyc", "KYC pending"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                filter === id
                  ? "bg-cyan-400 text-ink-950"
                  : "bg-white/5 text-slate-400 hover:bg-white/10"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-ink-900/50">
          <div className="hidden grid-cols-[1.3fr_0.9fr_0.55fr_0.7fr_0.9fr] gap-2 border-b border-white/5 px-4 py-2 text-[10px] uppercase tracking-wide text-slate-500 lg:grid">
            <span>User</span>
            <span>IP</span>
            <span>Balance</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
          <ul className="divide-y divide-white/5">
            {loading ? (
              <li className="px-4 py-8 text-center text-sm text-slate-500">
                Loading users…
              </li>
            ) : users.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-slate-500">
                No users match this filter.
              </li>
            ) : (
              users.map((u) => {
                const ip = u.lastIp || u.signupIp || "—";
                return (
                  <li
                    key={u.id}
                    className="grid gap-2 px-4 py-3 transition hover:bg-white/[0.03] lg:grid-cols-[1.3fr_0.9fr_0.55fr_0.7fr_0.9fr] lg:items-center"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">{u.name}</p>
                      <p className="truncate text-xs text-slate-500">{u.email}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs text-cyan-200">
                        {ip}
                      </p>
                      <p className="truncate text-[10px] text-slate-500">
                        {u.district || u.country || "—"}
                      </p>
                      {u.signupIp &&
                        u.lastIp &&
                        u.signupIp !== u.lastIp && (
                          <p className="truncate font-mono text-[10px] text-slate-600">
                            signup {u.signupIp}
                          </p>
                        )}
                    </div>
                    <p className="font-mono text-sm text-slate-200">
                      {formatCoins(u.balance)}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      <Badge
                        tone={
                          u.accountStatus === "banned"
                            ? "bad"
                            : u.accountStatus === "restricted"
                              ? "warn"
                              : "ok"
                        }
                      >
                        {u.accountStatus}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="inline-flex h-8 items-center rounded-lg border border-white/15 px-2.5 text-[11px] font-semibold text-white hover:border-cyan-400/40"
                      >
                        Open
                      </Link>
                      {u.accountStatus !== "banned" && (
                        <Tiny danger onClick={() => void quickBan(u)}>
                          Ban
                        </Tiny>
                      )}
                      {ip !== "—" && ip !== "unknown" && (
                        <Tiny danger onClick={() => void banIp(ip)}>
                          Ban IP
                        </Tiny>
                      )}
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </div>
    </AdminShell>
  );
}
