"use client";

import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { LandingAdvance } from "@/components/LandingAdvance";
import { HighEarningOffers } from "@/components/HighEarningOffers";
import { CashOutOptions } from "@/components/CashOutOptions";
import { Faucet } from "@/components/Faucet";
import { StreakRewards } from "@/components/StreakRewards";
import { Footer } from "@/components/Footer";
import { MobileNav } from "@/components/MobileNav";
import { RedirectIfLoggedIn } from "@/components/RedirectIfLoggedIn";

/** Guest landing only — no live feed / dashboard features until login */
export default function HomePage() {
  return (
    <RedirectIfLoggedIn to="/dashboard">
      <div className="flex min-h-screen flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
        <Navbar />
        <main className="flex-1">
          <Hero />
          <LandingAdvance />
          <HighEarningOffers />
          <CashOutOptions />
          <Faucet />
          <StreakRewards />
        </main>
        <Footer />
        <MobileNav />
      </div>
    </RedirectIfLoggedIn>
  );
}
