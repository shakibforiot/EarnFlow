import type { Metadata } from "next";
import { SitePageShell } from "@/components/SitePageShell";

export const metadata: Metadata = {
  title: "Cookies Policy — EarnFlow",
  description: "How EarnFlow uses cookies and similar technologies.",
};

export default function CookiesPage() {
  return (
    <SitePageShell
      title="Cookies Policy"
      subtitle="How we use cookies and local storage on EarnFlow."
    >
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">What we use</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-white">Essential:</strong> session / login
            state so you stay signed in securely.
          </li>
          <li>
            <strong className="text-white">Preferences:</strong> UI choices such
            as chat button position saved in local storage.
          </li>
          <li>
            <strong className="text-white">Security:</strong> signals that help
            detect abuse and multi-account attempts.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">Your control</h2>
        <p>
          You can clear cookies and site data in your browser settings. Doing so
          may sign you out or reset preferences. For more on data use, read the{" "}
          <a href="/privacy" className="text-cyan-300 hover:underline">
            Privacy Policy
          </a>
          .
        </p>
      </section>
    </SitePageShell>
  );
}
