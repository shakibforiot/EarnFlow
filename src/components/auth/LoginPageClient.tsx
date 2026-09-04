"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { LoginForm } from "@/components/auth/LoginForm";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { RedirectIfLoggedIn } from "@/components/RedirectIfLoggedIn";

export function LoginPageClient() {
  return (
    <RedirectIfLoggedIn to="/dashboard">
      <AuthPageShell>
        <div className="mb-6 flex items-center justify-between">
          <Logo href="/" />
          <Link
            href="/signup"
            className="text-sm font-medium text-cyan-300 hover:underline"
          >
            Sign Up
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-white">Sign In</h1>
        <p className="mt-1 text-sm text-slate-400">Sign in and earn with us.</p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </AuthPageShell>
    </RedirectIfLoggedIn>
  );
}
