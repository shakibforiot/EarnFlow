"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AdminShell, useAdmin } from "@/components/admin/AdminProvider";
import { Badge, Tiny } from "@/components/admin/AdminUI";
import { Button } from "@/components/Button";
import { formatCoins, formatUsd } from "@/data/dashboard";
import { ago } from "@/lib/admin-types";

type CashoutRow = {
  id: string;
  userId?: string;
  email: string;
  name: string;
  method: string;
  amountUsd: number;
  coins: number;
  status: string;
  giftCode?: string | null;
  destination?: string | null;
  createdAt: string;
  signupIp?: string;
  lastIp?: string;
  district?: string;
  accountStatus?: string;
};

export default function AdminCashoutsPage() {
  const { api, flash, setError, stats, busy } = useAdmin();
  const [filter, setFilter] = useState("pending");
  const [rows, setRows] = useState<CashoutRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api<{ cashouts?: CashoutRow[]; error?: string }>(
      `/api/admin/cashouts?status=${filter}`,
    );
    if (!res.ok) setError(res.data.error || "Failed to load cashouts");
    else setRows(res.data.cashouts ?? []);
    setLoading(false);
  }, [api, filter, setError]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(id: string, action: "approve" | "reject") {
    if (action === "reject" && !window.confirm("Reject and refund coins?"))
      return;
    let giftCode: string | undefined;
    let adminNote: string | undefined;
    if (action === "approve") {
      const code = window.prompt(
        "Gift / payout code (optional — auto-generated for gift cards if empty):",
        "",
      );
      if (code === null) return;
      giftCode = code.trim() || undefined;
      const note = window.prompt("Admin note (optional):", "") ?? undefined;
      adminNote = note?.trim() || undefined;
    }
    const res = await api<{ error?: string; giftCode?: string }>(
      "/api/admin/cashouts",
      {
        method: "PATCH",
        json: { cashoutId: id, action, giftCode, adminNote },
      },
    );
    if (!res.ok) {
      setError(res.data.error || "Cashout failed");
      return;
    }
    flash(
      res.data.giftCode
        ? `Approved · code ${res.data.giftCode}`
        : `Cashout ${action}d`,
    );
    void load();
  }

  async function banUser(userId: string, name: string) {
    const reason = window.prompt(`Ban ${name}?`, "Banned by admin");
    if (reason == null) return;
    const res = await api<{ error?: string }>("/api/admin/users", {
      method: "PATCH",
      json: { userId, action: "ban", banReason: reason },
    });
    if (!res.ok) {
      setError(res.data.error || "Ban failed");
      return;
    }
    flash(`Banned ${name}`);
    void load();
  }

  return (
    <AdminShell
      title="Payouts"
      subtitle="Approve / reject cash outs · ban users · see IP & jila"
      actions={
        <Button size="sm" variant="outline" onClick={() => void load()} disabled={busy}>
          Reload
        </Button>
      }
    >
      <div className="animate-fade-up space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {(["pending", "approved", "rejected", "all"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold capitalize transition ${
                filter === s
                  ? "bg-cyan-400 text-ink-950"
                  : "bg-white/5 text-slate-400 hover:bg-white/10"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {stats && filter === "pending" && (
          <p className="text-sm text-slate-400">
            Queue:{" "}
            <span className="font-semibold text-amber-200">
              {formatUsd(stats.cashouts.pendingUsd)}
            </span>{" "}
            · {stats.cashouts.pending} waiting
          </p>
        )}

        <ul className="space-y-2">
          {loading ? (
            <li className="text-sm text-slate-500">Loading…</li>
          ) : !rows.length ? (
            <li className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-slate-500">
              No cash outs in this filter.
            </li>
          ) : (
            rows.map((c) => {
              const ip = c.lastIp || c.signupIp || "—";
              return (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-ink-900/60 p-4"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-white">{c.name || "User"}</p>
                      <Badge
                        tone={
                          c.status === "pending"
                            ? "warn"
                            : c.status === "approved"
                              ? "ok"
                              : "bad"
                        }
                      >
                        {c.status}
                      </Badge>
                      {c.accountStatus === "banned" && (
                        <Badge tone="bad">banned</Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{c.email}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {c.method} · {formatUsd(c.amountUsd)} ·{" "}
                      {formatCoins(c.coins)} coins · {ago(c.createdAt)}
                    </p>
                    {c.destination ? (
                      <p className="mt-1 font-mono text-[11px] text-cyan-200/90">
                        To: {c.destination}
                      </p>
                    ) : null}
                    {c.giftCode && (
                      <p className="mt-1 font-mono text-[11px] text-emerald-300">
                        Code: {c.giftCode}
                      </p>
                    )}
                    <p className="mt-1 font-mono text-[11px] text-cyan-200/90">
                      IP {ip}
                      {c.district ? ` · Jila: ${c.district}` : ""}
                    </p>
                    {c.userId && (
                      <Link
                        href={`/admin/users/${c.userId}`}
                        className="mt-1 inline-block text-[11px] text-cyan-300 hover:text-cyan-200"
                      >
                        Open user →
                      </Link>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {c.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => void act(c.id, "approve")}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void act(c.id, "reject")}
                        >
                          Reject + refund
                        </Button>
                      </>
                    )}
                    {c.userId && c.accountStatus !== "banned" && (
                      <Tiny
                        danger
                        onClick={() => void banUser(c.userId!, c.name || "user")}
                      >
                        Ban user
                      </Tiny>
                    )}
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </AdminShell>
  );
}
