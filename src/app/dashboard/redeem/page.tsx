"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { getSession, saveSession } from "@/lib/session";

export default function RedeemPage() {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");
    const session = getSession();
    if (!session) {
      setError("Please sign in again.");
      return;
    }
    if (!code.trim()) {
      setError("Enter a redeem code.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim(), userId: session.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Redeem failed.");
        return;
      }
      saveSession(data.user);
      window.dispatchEvent(new Event("earnflow-session"));
      setMessage(`Success! +${data.coins} coins added to your balance.`);
      setCode("");
    } catch {
      setError("Redeem failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Redeem Code</h1>
        <p className="mt-1 text-sm text-slate-400">
          Enter a promo or reward code to instantly add coins to your balance.
        </p>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-900 via-ink-900 to-emerald-950/40 p-6 sm:p-8">
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-500/20 blur-3xl"
          aria-hidden
        />
        <form className="relative space-y-4" onSubmit={onSubmit}>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-400">
              Redeem code
            </span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Enter code"
              className="h-12 w-full rounded-xl border border-white/10 bg-ink-950/70 px-4 font-mono text-sm tracking-wider text-white outline-none focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20"
            />
          </label>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={loading}
          >
            {loading ? "Redeeming…" : "Redeem Now"}
          </Button>
        </form>

        {message && (
          <p className="relative mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            {message}
          </p>
        )}
        {error && (
          <p className="relative mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
