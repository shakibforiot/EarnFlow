"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { cashMethods, formatCoins, formatUsd } from "@/data/dashboard";
import { Button } from "@/components/Button";
import { getSession, saveSession, type SessionUser } from "@/lib/session";
import {
  getCompletenessItems,
  isProfileComplete,
} from "@/lib/profile-complete";
import { COINS_PER_USD, coinsToUsd, usdToCoins } from "@/lib/economy";

export default function CashOutPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [method, setMethod] = useState(cashMethods[0]?.id ?? "");
  const [amount, setAmount] = useState("5.00");
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const session = getSession();
      if (!session) return;
      setUser(session);
      try {
        const res = await fetch(`/api/profile?userId=${session.id}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (res.ok && data.user) {
          saveSession(data.user);
          setUser(data.user);
        }
      } catch {
        /* keep session */
      }
    }
    void load();
  }, []);

  const selected = cashMethods.find((m) => m.id === method);
  const coins = user?.balance ?? 0;
  const usdApprox = coinsToUsd(coins);
  const amountUsd = Number(amount);
  const amountCoins = Number.isFinite(amountUsd) ? usdToCoins(amountUsd) : 0;
  const complete = isProfileComplete(user);
  const missing = useMemo(
    () => getCompletenessItems(user).filter((i) => !i.done),
    [user],
  );

  async function submit() {
    setStatus("idle");
    setMessage("");
    const value = Number(amount);
    if (!selected || !user || Number.isNaN(value) || value <= 0) {
      setStatus("err");
      setMessage("Check amount and method.");
      return;
    }
    if (!complete) {
      setStatus("err");
      setMessage("Complete your profile before cash out.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/cashout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          method: selected.id,
          methodName: selected.name,
          amountUsd: value,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("err");
        setMessage(data.error || "Cash out failed.");
        return;
      }
      saveSession(data.user);
      setUser(data.user);
      window.dispatchEvent(new Event("earnflow-session"));
      setStatus("ok");
      setMessage("Cash out submitted as pending. Check Profile for status.");
    } catch {
      setStatus("err");
      setMessage("Cash out failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Cash Out</h1>
        <p className="mt-1 text-sm text-slate-400">
          Rate: {COINS_PER_USD.toLocaleString()} coins = $1. Complete your
          profile first — then request a payout.
        </p>
      </div>

      {!complete && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
          <p className="text-sm font-semibold text-amber-100">
            Cash out locked — finish these profile steps:
          </p>
          <ul className="mt-3 space-y-2">
            {missing.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className="text-sm text-amber-200 underline-offset-2 hover:underline"
                >
                  • {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <Button
            variant="secondary"
            size="sm"
            className="mt-4"
            href="/dashboard/profile"
          >
            Complete profile
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-ink-900/70 p-4">
          <p className="text-xs text-slate-500">Available coins</p>
          <p className="mt-1 text-2xl font-bold text-cyan-300">{formatCoins(coins)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-ink-900/70 p-4">
          <p className="text-xs text-slate-500">Approx. value</p>
          <p className="mt-1 text-2xl font-bold text-white">{formatUsd(usdApprox)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-ink-900/70 p-4">
          <p className="text-xs text-slate-500">Selected method</p>
          <p className="mt-1 text-2xl font-bold text-white">{selected?.name ?? "—"}</p>
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-bold text-white">Choose method</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {cashMethods.map((m) => (
            <button
              key={m.id}
              type="button"
              disabled={!complete}
              onClick={() => setMethod(m.id)}
              className={`rounded-2xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-40 ${
                method === m.id
                  ? "border-cyan-400/50 bg-cyan-500/10"
                  : "border-white/10 bg-ink-900/60 hover:border-white/20"
              }`}
            >
              <p className="font-semibold text-white">{m.name}</p>
              <p className="mt-1 text-[11px] text-slate-500">Min {m.min}</p>
              <p className="text-[11px] text-slate-500">Fee: {m.fee}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-ink-900/70 p-5">
        <h2 className="text-lg font-bold text-white">Request payout</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
          <label className="block">
            <span className="mb-1.5 block text-xs text-slate-400">Amount (USD)</span>
            <input
              type="number"
              min="1"
              step="0.01"
              value={amount}
              disabled={!complete}
              onChange={(e) => setAmount(e.target.value)}
              className="h-11 w-full rounded-xl border border-white/10 bg-ink-950/60 px-3.5 text-sm text-white outline-none focus:border-cyan-400/50 disabled:opacity-40"
            />
            {amountCoins > 0 && (
              <p className="mt-1.5 text-[11px] text-slate-500">
                Costs {formatCoins(amountCoins)} coins ({COINS_PER_USD.toLocaleString()}{" "}
                = $1)
              </p>
            )}
          </label>
          <div className="flex items-end">
            <Button
              variant="primary"
              size="lg"
              className="w-full sm:w-auto"
              disabled={loading || !complete}
              onClick={submit}
            >
              {loading ? "Submitting…" : "Cash Out"}
            </Button>
          </div>
        </div>
        {status === "ok" && (
          <p className="mt-3 text-sm text-emerald-300">{message}</p>
        )}
        {status === "err" && (
          <p className="mt-3 text-sm text-red-300">{message}</p>
        )}
      </section>
    </div>
  );
}
