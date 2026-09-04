import type { Metadata } from "next";
import { LoginPageClient } from "@/components/auth/LoginPageClient";

export const metadata: Metadata = {
  title: "Sign In — EarnFlow",
  description: "Sign in to your EarnFlow account.",
};

export default function LoginPage() {
  return <LoginPageClient />;
}
