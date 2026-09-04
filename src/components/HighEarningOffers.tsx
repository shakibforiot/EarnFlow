"use client";

import { EmptyState } from "@/components/EmptyState";
import { Button } from "./Button";
import { Reveal } from "@/components/Reveal";

export function HighEarningOffers() {
  return (
    <section id="offers" className="py-10 sm:py-14">
      <div className="container-max section-pad">
        <Reveal>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">
                High Earning Offers
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Live offers appear here once admin adds them in Catalog.
              </p>
            </div>
            <Button variant="secondary" size="sm" href="/signup">
              Create account
            </Button>
          </div>
        </Reveal>

        <Reveal delay={80}>
          <div className="mt-6">
            <EmptyState
              title="Sign up to unlock offers"
              description="Create a free account to browse offers, surveys, and games."
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
