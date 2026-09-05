"use client";

import { EmptyState } from "@/components/EmptyState";
import { Button } from "./Button";
import { Reveal } from "@/components/Reveal";
import { useAuthModal } from "@/components/auth/AuthProvider";

export function HighEarningOffers() {
  const { openAuth } = useAuthModal();

  return (
    <section id="offers" className="py-10 sm:py-14">
      <div className="container-max section-pad">
        <Reveal>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">
                Offers
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Real partner offerwalls and admin catalog tasks appear after you
                sign in — nothing fake is listed here.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => openAuth("signup")}
            >
              Create account
            </Button>
          </div>
        </Reveal>

        <Reveal delay={80}>
          <div className="mt-6">
            <EmptyState
              title="No public offer list"
              description="Sign in to open AdGem / PubScale walls and any live catalog offers."
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
