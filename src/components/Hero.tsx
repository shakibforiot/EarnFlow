"use client";

import Image from "next/image";
import { Suspense } from "react";
import { Button } from "./Button";
import { useAuthModal } from "./auth/AuthProvider";
import { SignupForm } from "./auth/SignupForm";
import { heroImage } from "@/data/site";
import { useSiteCatalog } from "@/hooks/useSiteCatalog";
import { COINS_PER_USD } from "@/lib/economy";

export function Hero() {
  const { openAuth } = useAuthModal();
  const catalog = useSiteCatalog();

  return (
    <section
      id="home"
      className="relative overflow-hidden py-10 sm:py-14 md:py-16 lg:min-h-[min(82vh,900px)] lg:py-20"
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <Image
          src={heroImage}
          alt=""
          fill
          priority
          className="object-cover opacity-40"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/80 to-ink-950/55" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-transparent to-ink-950/70" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(6,182,212,0.22),_transparent_50%)]" />
        <div className="absolute left-[12%] top-[28%] h-40 w-40 rounded-full bg-cyan-400/15 blur-3xl animate-float" />
        <div className="absolute bottom-[18%] right-[18%] h-36 w-36 rounded-full bg-emerald-400/12 blur-3xl animate-float-delayed" />
      </div>

      <div className="container-max section-pad relative grid items-center gap-8 md:gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
        <div className="animate-fade-up min-w-0">
          <div className="mb-4 inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1 text-[11px] font-medium text-cyan-200 sm:mb-5">
            <span className="h-1.5 w-1.5 shrink-0 animate-pulse-soft rounded-full bg-cyan-400" />
            <span className="min-w-0">
              {COINS_PER_USD.toLocaleString()} coins = $1 · Live support
            </span>
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl lg:text-[4.25rem] lg:leading-[1.05]">
            EarnFlow
          </h1>
          <div className="mt-3 h-px w-28 origin-left bg-gradient-to-r from-cyan-400 to-transparent animate-glow-line" />
          <p
            className="mt-4 max-w-xl animate-fade-up text-lg font-medium text-slate-100 sm:text-xl md:text-2xl"
            style={{ animationDelay: "80ms" }}
          >
            {catalog.landingHeadline}
          </p>
          <p
            className="mt-3 max-w-lg animate-fade-up text-sm text-slate-400 sm:text-base md:text-lg"
            style={{ animationDelay: "140ms" }}
          >
            {catalog.landingSubheadline}
          </p>

          <div
            className="mt-6 flex animate-fade-up flex-wrap gap-2 text-[11px] text-slate-400"
            style={{ animationDelay: "200ms" }}
          >
            {[
              "Daily free coins",
              "Referral bonuses",
              "Secure profile",
              "Fair payouts",
            ].map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 transition hover:border-cyan-400/30 hover:text-cyan-100"
              >
                {chip}
              </span>
            ))}
          </div>

          <div
            className="mt-8 flex animate-fade-up flex-wrap gap-3 md:hidden"
            style={{ animationDelay: "260ms" }}
          >
            <Button
              variant="primary"
              size="lg"
              className="min-h-12 flex-1 sm:flex-none"
              onClick={() => openAuth("signup")}
            >
              {catalog.landingCta}
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="min-h-12 flex-1 sm:flex-none"
              onClick={() => openAuth("login")}
            >
              Sign In
            </Button>
          </div>
        </div>

        <div
          className="animate-fade-up mx-auto hidden w-full max-w-md md:block"
          style={{ animationDelay: "100ms" }}
        >
          <div className="relative overflow-hidden rounded-3xl border border-white/12 bg-ink-900/85 p-5 shadow-2xl shadow-cyan-500/10 backdrop-blur-xl sm:p-6">
            <div
              className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-cyan-500/25 blur-3xl animate-pulse-soft"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-emerald-500/20 blur-3xl animate-float-delayed"
              aria-hidden
            />
            <h2 className="relative text-xl font-bold text-white">
              Sign Up Now For Free
            </h2>
            <p className="relative mt-1 text-sm text-slate-400">
              Create an account and start earning today.
            </p>
            <div className="relative mt-5">
              <Suspense
                fallback={<p className="text-sm text-slate-400">Loading…</p>}
              >
                <SignupForm
                  showSwitch
                  onSwitchLogin={() => openAuth("login")}
                  onSuccess={() => {}}
                />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
