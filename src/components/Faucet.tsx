"use client";

import { Button } from "./Button";
import { useAuthModal } from "./auth/AuthProvider";

export function Faucet() {
  const { openAuth } = useAuthModal();

  return (
    <section id="faucet" className="py-10 sm:py-14">
      <div className="container-max section-pad">
        <div className="card relative overflow-hidden p-6 sm:p-8 lg:p-10 animate-fade-up">
          <div
            className="pointer-events-none absolute -right-16 top-0 h-48 w-48 rounded-full bg-cyan-500/20 blur-3xl animate-pulse-soft"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -left-10 bottom-0 h-36 w-36 rounded-full bg-emerald-500/15 blur-3xl animate-float-delayed"
            aria-hidden
          />
          <div className="relative grid items-center gap-6 lg:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-cyan-300">Free Coin Faucet</p>
              <h2 className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">
                Claim free coins on cooldown
              </h2>
              <p className="mt-3 text-slate-300">
                Claim up to <span className="font-semibold text-white">100 coins</span>{" "}
                &amp; <span className="font-semibold text-white">1 XP</span> every
                cycle — completely free. Timing is controlled by admin.
              </p>
              <div className="mt-6">
                <Button variant="primary" onClick={() => openAuth("login")}>
                  Sign In to Claim
                </Button>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-ink-950/60 p-5 transition hover:border-cyan-400/25">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">Next claim</p>
                <span className="rounded-full bg-cyan-500/15 px-2.5 py-1 text-xs font-medium text-cyan-300">
                  Ready
                </span>
              </div>
              <p className="mt-3 font-mono text-4xl font-bold tracking-wider text-white">
                00:00
              </p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 animate-shimmer" />
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Sign in to start claiming.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
