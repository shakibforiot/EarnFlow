import type { Metadata } from "next";
import { SitePageShell } from "@/components/SitePageShell";
import { ContactForm } from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "Contact — EarnFlow",
  description: "Contact EarnFlow support for account, payout, or general questions.",
};

export default function ContactPage() {
  return (
    <SitePageShell
      title="Contact"
      subtitle="Questions, payout help, or account issues — send a message and our team will follow up."
    >
      <ContactForm />
    </SitePageShell>
  );
}
