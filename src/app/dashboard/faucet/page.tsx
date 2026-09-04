"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { getSession, saveSession, type SessionUser } from "@/lib/session";

function formatWait(sec: number) {
  const m = Math.floor(Math.max(0, sec) / 60);
  const s = Math.max(0, sec) % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function FaucetPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [waitSec, setWaitSec] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadStatus(session: SessionUser) {
    try {
      const res = await fetch(`/api/faucet?userId=${session.id}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (res.ok) setWaitSec(data.waitSec ?? 0);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    const session = getSession();
    if (!session) return;
    setUser(session);
    void loadStatus(session);
  }, []);

  useEffect(() => {
    if (waitSec <= 0) return;
    const t = window.setTimeout(() => {
      setWaitSec((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearTimeout(t);
  }, [waitSec]);

  async function claim() {
    if (!user) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Claim failed.");
        if (typeof data.waitSec === "number") setWaitSec(data.waitSec);
        return;
      }
      saveSession(data.user);
      setUser(data.user);
      window.dispatchEvent(new Event("earnflow-session"));
      setWaitSec(data.waitSec ?? 1800);
      setSuccess("+100 coins added to your balance.");
    } catch {
      setError("Claim failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const ready = waitSec <= 0;
  const progress = ready ? 100 : Math.max(2, 100 - (waitSec / 1800) * 100);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Daily Free</h1>
        <p className="mt-2 text-sm text-slate-400">
          Claim up to 100 coins &amp; 1 XP every 30 minutes.
        </p>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-900 via-ink-900 to-cyan-950/40 p-6 text-center sm:p-8">
        <div
          className="pointer-events-none absolute -left-10 top-0 h-32 w-32 rounded-full bg-cyan-500/20 blur-3xl"
          aria-hidden
        />
        <p className="relative text-sm text-slate-400">
          {ready ? "Ready to claim" : "Next claim in"}
        </p>
        <p className="relative mt-2 font-mono text-5xl font-bold text-white">
          {formatWait(waitSec)}
        </p>
        <div className="relative mx-auto mt-5 h-2 max-w-xs overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-cyan-400 transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="relative mt-6">
          <Button
            variant="primary"
            size="lg"
            className="w-full sm:w-auto"
            disabled={!ready || loading || !user}
            onClick={claim}
          >
            {!ready
              ? "On cooldown"
              : loading
                ? "Claiming…"
                : "Claim 100 coins"}
          </Button>
        </div>
        {success && (
          <p className="relative mt-3 text-sm text-emerald-300">{success}</p>
        )}
        {error && (
          <p className="relative mt-3 text-sm text-red-300">{error}</p>
        )}
      </div>
    </div>
  );
}
