import type { Metadata } from "next";
import { SitePageShell } from "@/components/SitePageShell";

export const metadata: Metadata = {
  title: "Privacy Policy — EarnFlow",
  description: "How EarnFlow collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <SitePageShell
      title="Privacy Policy"
      subtitle={`Last updated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`}
    >
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">1. What we collect</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>Account data: name, email, password hash, country, phone</li>
          <li>Payout details you provide (PayPal, crypto address, etc.)</li>
          <li>KYC documents when you submit verification</li>
          <li>Usage data: offers completed, balances, device/IP for abuse prevention</li>
          <li>Support messages you send in live chat or contact forms</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">2. How we use data</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>Operate accounts, rewards, and cash outs</li>
          <li>Prevent fraud and enforce one-account rules</li>
          <li>Provide customer support</li>
          <li>Improve the product and communicate important updates</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">3. Sharing</h2>
        <p>
          We do not sell your personal information. We may share data with
          payment processors, offer partners (to credit completions), hosting
          providers, and when required by law.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">4. Security</h2>
        <p>
          Passwords are hashed. Access to admin tools is restricted. No method
          of transmission is 100% secure — please use a strong unique password.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">5. Retention</h2>
        <p>
          We keep account and transaction records as long as needed for
          operations, dispute handling, and legal obligations. You may request
          account deletion via Contact; some records may be retained where
          required.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">6. Your choices</h2>
        <p>
          Update profile details in the dashboard. For privacy requests or data
          questions, use{" "}
          <a href="/contact" className="text-cyan-300 hover:underline">
            Contact
          </a>
          . See also our{" "}
          <a href="/cookies" className="text-cyan-300 hover:underline">
            Cookies Policy
          </a>
          .
        </p>
      </section>
    </SitePageShell>
  );
}
