"use client";

import { Suspense } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SignupForm } from "@/components/auth/SignupForm";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { RedirectIfLoggedIn } from "@/components/RedirectIfLoggedIn";

export function SignupPageClient() {
  return (
    <RedirectIfLoggedIn to="/dashboard">
      <AuthPageShell>
        <div className="mb-6 flex items-center justify-between">
          <Logo href="/" />
          <Link
            href="/login"
            className="text-sm font-medium text-cyan-300 hover:underline"
          >
            Sign In
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-white">Sign Up</h1>
        <p className="mt-1 text-sm text-slate-400">
          Create an account and start earning.
        </p>
        <div className="mt-6">
          <Suspense fallback={<p className="text-sm text-slate-400">Loading…</p>}>
            <SignupForm />
          </Suspense>
        </div>
      </AuthPageShell>
    </RedirectIfLoggedIn>
  );
}
