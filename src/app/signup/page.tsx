import type { Metadata } from "next";
import { SignupPageClient } from "@/components/auth/SignupPageClient";

export const metadata: Metadata = {
  title: "Sign Up — EarnFlow",
  description: "Create your free EarnFlow account.",
};

export default function SignupPage() {
  return <SignupPageClient />;
}
