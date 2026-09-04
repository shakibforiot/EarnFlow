"use client";

import { streakDays, howSteps } from "@/data/site";
import { Reveal } from "@/components/Reveal";

export function StreakRewards() {
  return (
    <section id="streak" className="py-10 sm:py-14">
      <div className="container-max section-pad">
        <div className="grid gap-8 lg:grid-cols-2">
          <Reveal>
            <div className="card h-full p-6 sm:p-7">
              <h2 className="font-display text-xl font-bold text-white sm:text-2xl">
                7-Day Streak Rewards
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Earn escalating bonuses by consistently completing daily goals
                for seven consecutive days. The longer your streak, the higher
                your bonus.
              </p>

              <div className="mt-6 grid grid-cols-7 gap-1 xs:gap-1.5 sm:gap-2">
                {streakDays.map((day, i) => (
                  <div
                    key={day.day}
                    style={{ transitionDelay: `${i * 40}ms` }}
                    className={`rounded-lg border p-1.5 text-center transition duration-300 hover:-translate-y-1 sm:rounded-xl sm:p-2 ${
                      day.highlight
                        ? "border-cyan-400/40 bg-cyan-500/15 shadow-[0_0_20px_rgba(34,211,238,0.15)]"
                        : "border-white/10 bg-white/[0.03] hover:border-white/20"
                    }`}
                  >
                    <p className="text-[9px] text-slate-400 sm:text-[10px]">
                      D{day.day}
                    </p>
                    <p
                      className={`mt-0.5 text-[9px] font-semibold leading-tight sm:mt-1 sm:text-xs ${
                        day.highlight ? "text-cyan-300" : "text-slate-200"
                      }`}
                    >
                      {day.reward}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-white/8 bg-ink-950/50 p-4 transition hover:border-cyan-400/20">
                  <h3 className="text-sm font-semibold text-white">How to Earn</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                    Complete offers or surveys to maintain your daily streak and
                    unlock rewards.
                  </p>
                </div>
                <div className="rounded-xl border border-white/8 bg-ink-950/50 p-4 transition hover:border-cyan-400/20">
                  <h3 className="text-sm font-semibold text-white">Day 7 Reward</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                    Hit day 7 to unlock your streak bonus reward.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <div className="card h-full p-6 sm:p-7">
              <h2 className="font-display text-xl font-bold text-white sm:text-2xl">
                How It Works
              </h2>
              <ol className="mt-6 space-y-4">
                {howSteps.map((step, i) => (
                  <li
                    key={step.title}
                    className="flex gap-4 rounded-xl p-2 transition hover:bg-white/[0.03]"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-500/15 text-sm font-bold text-cyan-300">
                      {i + 1}
                    </span>
                    <div>
                      <h3 className="font-semibold text-white">{step.title}</h3>
                      <p className="mt-0.5 text-sm text-slate-400">
                        {step.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
