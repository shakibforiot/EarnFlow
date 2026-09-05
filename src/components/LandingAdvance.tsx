"use client";

import Link from "next/link";
import { howSteps } from "@/data/site";
import { useAuthModal } from "@/components/auth/AuthProvider";
import { useSiteCatalog } from "@/hooks/useSiteCatalog";
import { Reveal } from "@/components/Reveal";
import { COINS_PER_USD } from "@/lib/economy";
import { Button } from "@/components/Button";

const paths = [
  {
    title: "Offers",
    desc: "Complete tasks and apps for coin rewards.",
    href: "#offers",
    accent: "from-cyan-500/20",
  },
  {
    title: "Surveys",
    desc: "Short research tasks with quick coin payouts.",
    href: "#offers",
    accent: "from-emerald-500/20",
  },
  {
    title: "Games",
    desc: "Play, hit milestones, unlock bigger bonuses.",
    href: "#offers",
    accent: "from-sky-500/20",
  },
  {
    title: "Daily Free",
    desc: "Claim faucet coins on a custom cooldown.",
    href: "#faucet",
    accent: "from-amber-500/15",
  },
];

const trust = [
  { title: "Fixed rate", body: `${COINS_PER_USD.toLocaleString()} coins = $1` },
  { title: "One account", body: "IP limit keeps earnings fair" },
  { title: "Secure profile", body: "Email · KYC · payout locks" },
  { title: "Live support", body: "Bot help + human admins" },
];

const faq = [
  {
    q: "Is EarnFlow free to join?",
    a: "Yes. Create an account, verify your profile steps, and start earning coins.",
  },
  {
    q: "What is the coin rate?",
    a: `${COINS_PER_USD.toLocaleString()} coins equal $1.00 USD when you cash out.`,
  },
  {
    q: "How do I cash out?",
    a: "Reach the minimum balance, add PayPal, bKash, Nagad, or crypto, then submit a cash out from your dashboard.",
  },
  {
    q: "Why do I need KYC / email?",
    a: "Safety locks protect payouts. Complete checklist items once — they stay locked after.",
  },
  {
    q: "Can I make multiple accounts?",
    a: "No. One account per IP. Extra accounts are blocked automatically.",
  },
  {
    q: "Who can help if I’m stuck?",
    a: "Use live chat in the dashboard, or send a message on the Contact page.",
  },
];

export function LandingAdvance() {
  const { openAuth } = useAuthModal();
  const catalog = useSiteCatalog();

  return (
    <>
      {/* Platform strip */}
      <section className="relative border-y border-white/5 bg-ink-900/40 py-12 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_0%,_rgba(6,182,212,0.1),_transparent_50%)]"
          aria-hidden
        />
        <div className="container-max section-pad relative">
          <Reveal>
            <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-300/80">
                  GPT rewards platform
                </p>
                <h2 className="font-display mt-2 text-3xl font-bold text-white sm:text-4xl">
                  One place to earn, redeem, and cash out
                </h2>
                <p className="mt-3 max-w-xl text-sm text-slate-400 sm:text-base">
                  Offers, surveys, games, daily free coins, referral bonuses, and
                  promo codes — built like a real get-paid-to site with admin
                  control and live support.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { k: "Earn", v: "Offers · Surveys · Games" },
                  { k: "Bonus", v: "Faucet · Streak · Codes" },
                  { k: "Payout", v: "PayPal · Crypto · Cards" },
                  { k: "Safety", v: "Email · KYC · IP limit" },
                ].map((item, i) => (
                  <Reveal key={item.k} delay={i * 70}>
                    <div className="group h-full rounded-2xl border border-white/8 bg-ink-950/50 px-4 py-3 transition duration-300 hover:border-cyan-400/30 hover:bg-ink-950">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">
                        {item.k}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-white group-hover:text-cyan-100">
                        {item.v}
                      </p>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Rate highlight */}
      <section className="py-10">
        <div className="container-max section-pad">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 via-ink-900 to-ink-950 p-6 sm:p-8">
              <div
                className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-cyan-400/20 blur-3xl animate-pulse-soft"
                aria-hidden
              />
              <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">
                    Transparent economy
                  </p>
                  <h2 className="font-display mt-2 text-2xl font-bold text-white sm:text-3xl">
                    {COINS_PER_USD.toLocaleString()} coins = $1.00
                  </h2>
                  <p className="mt-2 max-w-md text-sm text-slate-400">
                    No hidden multipliers. Your balance converts at a fixed rate
                    when you cash out.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <div className="rounded-2xl border border-white/10 bg-ink-950/60 px-4 py-3">
                    <p className="text-[10px] uppercase text-slate-500">Example</p>
                    <p className="text-lg font-bold text-emerald-300">
                      5,000 → $5.00
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-ink-950/60 px-4 py-3">
                    <p className="text-[10px] uppercase text-slate-500">Example</p>
                    <p className="text-lg font-bold text-cyan-300">
                      10,000 → $10.00
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Earn paths */}
      <section id="earn" className="py-12 sm:py-16">
        <div className="container-max section-pad">
          <Reveal>
            <div className="max-w-2xl">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-300/80">
                Earn paths
              </p>
              <h2 className="font-display mt-2 text-3xl font-bold text-white sm:text-4xl">
                Multiple ways to stack coins
              </h2>
            </div>
          </Reveal>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {paths.map((p, i) => (
              <Reveal key={p.title} delay={i * 80}>
                <a
                  href={p.href}
                  className={`group relative block h-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b ${p.accent} to-ink-950 p-5 transition duration-300 hover:-translate-y-1 hover:border-cyan-400/35 hover:shadow-[0_20px_40px_rgba(0,0,0,0.35)]`}
                >
                  <span className="absolute right-4 top-4 h-8 w-8 rounded-full border border-white/10 opacity-40 transition group-hover:opacity-100 group-hover:border-cyan-400/40" />
                  <h3 className="text-base font-semibold text-white group-hover:text-cyan-200">
                    {p.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    {p.desc}
                  </p>
                  <p className="mt-4 text-xs font-semibold text-cyan-300/80 opacity-0 transition group-hover:opacity-100">
                    Explore →
                  </p>
                </a>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-12 sm:py-16">
        <div className="container-max section-pad">
          <Reveal>
            <div className="max-w-2xl">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-300/80">
                Simple flow
              </p>
              <h2 className="font-display mt-2 text-3xl font-bold text-white sm:text-4xl">
                From signup to cash out
              </h2>
              <p className="mt-3 text-sm text-slate-400 sm:text-base">
                Join free, finish checklist locks, earn coins, then withdraw when
                you hit the minimum.
              </p>
            </div>
          </Reveal>

          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {howSteps.map((step, i) => (
              <Reveal key={step.title} delay={i * 90}>
                <li className="relative h-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-ink-900 to-ink-950 p-5 transition duration-300 hover:border-white/20">
                  <span className="font-display text-3xl font-bold text-cyan-400/35">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-3 text-base font-semibold text-white">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    {step.description}
                  </p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Trust */}
      <section className="border-y border-white/5 bg-ink-900/30 py-12 sm:py-14">
        <div className="container-max section-pad">
          <Reveal>
            <div className="mb-8 max-w-xl">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-300/80">
                Why EarnFlow
              </p>
              <h2 className="font-display mt-2 text-3xl font-bold text-white">
                Built for trust, not hype
              </h2>
            </div>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {trust.map((t, i) => (
              <Reveal key={t.title} delay={i * 70}>
                <div className="h-full rounded-2xl border border-white/10 bg-ink-950/40 p-5 transition hover:border-emerald-400/25">
                  <h3 className="font-semibold text-white">{t.title}</h3>
                  <p className="mt-2 text-sm text-slate-400">{t.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={200}>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/about"
                className="text-sm font-medium text-cyan-300 hover:underline"
              >
                About EarnFlow
              </Link>
              <span className="text-slate-600">·</span>
              <Link
                href="/terms"
                className="text-sm font-medium text-slate-400 hover:text-cyan-300"
              >
                Terms
              </Link>
              <span className="text-slate-600">·</span>
              <Link
                href="/privacy"
                className="text-sm font-medium text-slate-400 hover:text-cyan-300"
              >
                Privacy
              </Link>
              <span className="text-slate-600">·</span>
              <Link
                href="/contact"
                className="text-sm font-medium text-slate-400 hover:text-cyan-300"
              >
                Contact
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden py-16 sm:py-20">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(6,182,212,0.14),_transparent_55%)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-3xl animate-float"
          aria-hidden
        />
        <div className="container-max section-pad relative text-center">
          <Reveal>
            <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
              Ready when you are
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-slate-400 sm:text-base">
              {catalog.landingSubheadline}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button
                variant="primary"
                size="lg"
                onClick={() => openAuth("signup")}
              >
                {catalog.landingCta || "Sign Up Free"}
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => openAuth("login")}
              >
                Sign in
              </Button>
              <Button variant="ghost" size="lg" href="/dashboard">
                Open dashboard
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-white/5 py-12 sm:py-16">
        <div className="container-max section-pad">
          <Reveal>
            <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">
              FAQ
            </h2>
          </Reveal>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {faq.map((item, i) => (
              <Reveal key={item.q} delay={(i % 2) * 60}>
                <details className="group rounded-2xl border border-white/10 bg-ink-900/50 px-4 py-3 transition open:border-cyan-400/25 open:bg-ink-900/80">
                  <summary className="cursor-pointer list-none text-sm font-semibold text-white marker:content-none">
                    <span className="flex items-center justify-between gap-3">
                      {item.q}
                      <span className="text-cyan-400 transition group-open:rotate-45">
                        +
                      </span>
                    </span>
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    {item.a}
                  </p>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
