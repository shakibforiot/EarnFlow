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
          <div className="relative max-w-xl">
            <p className="text-sm font-medium text-cyan-300">Daily Free</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">
              Claim free coins after you sign in
            </h2>
            <p className="mt-3 text-slate-300">
              Logged-in members can claim Daily Free coins on a cooldown set by
              admin. No sample timer — real status shows in your dashboard.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="primary" onClick={() => openAuth("login")}>
                Sign In to Claim
              </Button>
              <Button variant="outline" onClick={() => openAuth("signup")}>
                Create account
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
