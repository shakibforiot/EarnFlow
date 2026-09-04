import type { Metadata } from "next";
import { SitePageShell } from "@/components/SitePageShell";
import { COINS_PER_USD } from "@/lib/economy";

export const metadata: Metadata = {
  title: "About — EarnFlow",
  description: "Learn about EarnFlow — get paid for tasks, surveys, and offers.",
};

export default function AboutPage() {
  return (
    <SitePageShell
      title="About EarnFlow"
      subtitle="A get-paid-to platform built for clear rewards, fair cash outs, and real control over your earnings."
    >
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">Who we are</h2>
        <p>
          EarnFlow helps people turn free time into rewards. Complete offers,
          surveys, games, and daily tasks to collect coins — then cash out
          through PayPal, crypto, gift cards, and more when you reach the
          minimum.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">How it works</h2>
        <ol className="list-decimal space-y-2 pl-5">
          <li>Create a free account and verify your profile.</li>
          <li>Browse offers, surveys, and Daily Free rewards.</li>
          <li>
            Earn coins at a fixed rate of{" "}
            <strong className="text-white">
              {COINS_PER_USD.toLocaleString()} coins = $1
            </strong>
            .
          </li>
          <li>Request a cash out — our team reviews pending payouts.</li>
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">What we stand for</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>Transparent coin-to-USD rate</li>
          <li>One account per person / IP to keep the economy fair</li>
          <li>Profile and KYC checks before large payouts</li>
          <li>Live support with bot help and human admins</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">Need help?</h2>
        <p>
          Open live chat after you sign in, or visit our{" "}
          <a href="/contact" className="text-cyan-300 hover:underline">
            Contact
          </a>{" "}
          page. Legal details are in{" "}
          <a href="/terms" className="text-cyan-300 hover:underline">
            Terms
          </a>{" "}
          and{" "}
          <a href="/privacy" className="text-cyan-300 hover:underline">
            Privacy
          </a>
          .
        </p>
      </section>
    </SitePageShell>
  );
}
