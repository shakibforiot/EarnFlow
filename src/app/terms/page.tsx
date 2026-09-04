import type { Metadata } from "next";
import { SitePageShell } from "@/components/SitePageShell";
import { COINS_PER_USD } from "@/lib/economy";

export const metadata: Metadata = {
  title: "Terms of Service — EarnFlow",
  description: "EarnFlow terms of service and user agreement.",
};

export default function TermsPage() {
  return (
    <SitePageShell
      title="Terms of Service"
      subtitle={`Last updated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`}
    >
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">1. Acceptance</h2>
        <p>
          By creating an EarnFlow account or using the site, you agree to these
          Terms. If you do not agree, do not use the service.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">2. Eligibility</h2>
        <p>
          You must be at least 18 years old (or the age of majority where you
          live) and able to form a binding contract. One natural person may
          maintain one account. Multi-accounting, VPN abuse to evade limits, or
          sharing accounts may result in suspension.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">3. Rewards & coins</h2>
        <p>
          Coins are promotional credits inside EarnFlow. The published rate is{" "}
          <strong className="text-white">
            {COINS_PER_USD.toLocaleString()} coins = $1.00 USD
          </strong>
          . Coins have no cash value until a cash-out request is approved.
          EarnFlow may adjust offer rewards, faucet amounts, or minimum cash-out
          thresholds at any time.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">4. Cash outs</h2>
        <p>
          Payouts require a complete profile (including verification steps we
          request). Requests are reviewed manually. We may delay, reduce, or
          reject payouts tied to fraud, incomplete offers, chargebacks, or Terms
          violations. Processing times vary by method.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">5. Prohibited use</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>Fraud, bots, or fake completions</li>
          <li>Harassment or abuse of support</li>
          <li>Attempting to hack, scrape, or disrupt the platform</li>
          <li>Selling or transferring accounts or coins</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">6. Suspension</h2>
        <p>
          We may freeze, restrict, or ban accounts that violate these Terms.
          Banned balances may be forfeited. Appeals can be sent via the Contact
          page or live chat.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">7. Disclaimer</h2>
        <p>
          The service is provided “as is.” We do not guarantee uninterrupted
          uptime, specific earnings, or permanent availability of any offer
          partner. To the fullest extent allowed by law, EarnFlow is not liable
          for indirect or consequential damages.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">8. Changes</h2>
        <p>
          We may update these Terms. Continued use after changes means you accept
          the revised Terms. Questions:{" "}
          <a href="/contact" className="text-cyan-300 hover:underline">
            Contact us
          </a>
          .
        </p>
      </section>
    </SitePageShell>
  );
}
