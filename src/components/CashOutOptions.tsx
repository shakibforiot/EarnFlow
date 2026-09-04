"use client";

import { cashoutOptions } from "@/data/site";
import { Reveal } from "@/components/Reveal";

export function CashOutOptions() {
  return (
    <section id="cashout" className="py-10 sm:py-14">
      <div className="container-max section-pad">
        <Reveal>
          <h2 className="text-center font-display text-2xl font-bold text-white sm:text-3xl">
            Available Cash Out Options
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-center text-sm text-slate-400">
            Withdraw your coins through popular payment and gift card methods.
          </p>
        </Reveal>

        <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-6">
          {cashoutOptions.map((option, i) => (
            <Reveal key={option.id} delay={(i % 6) * 40}>
              <div className="group flex h-24 flex-col items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-b from-ink-800/80 to-ink-900 px-2 text-center transition duration-300 hover:-translate-y-1 hover:border-cyan-400/35 hover:shadow-lg hover:shadow-cyan-500/10">
                <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/15 text-sm font-bold text-cyan-300 transition group-hover:bg-cyan-400 group-hover:text-ink-950">
                  {option.name.slice(0, 1)}
                </span>
                <span className="text-[11px] font-medium text-slate-200 sm:text-xs">
                  {option.name}
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
