"use client";

import { Suspense } from "react";
import { Logo } from "@/components/Logo";
import { useAuthModal } from "./AuthProvider";
import { LoginForm } from "./LoginForm";
import { SignupForm } from "./SignupForm";
import { ForgotForm } from "./ForgotForm";

const titles = {
  login: {
    title: "Sign In",
    subtitle: "Sign in and earn with us.",
  },
  signup: {
    title: "Sign Up",
    subtitle: "Create an account and start earning.",
  },
  forgot: {
    title: "Forgot Password?",
    subtitle: "Let's get it back together.",
  },
} as const;

export function AuthModal() {
  const { open, mode, closeAuth, setMode } = useAuthModal();

  if (!open) return null;

  const copy = titles[mode];

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close auth dialog"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={closeAuth}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        className="relative z-10 flex max-h-[min(92dvh,920px)] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-white/12 bg-ink-900 shadow-2xl shadow-black/50 animate-fade-up sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
          <Logo href="/" />
          <button
            type="button"
            onClick={closeAuth}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 hover:text-white"
            aria-label="Close"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {mode !== "forgot" && (
          <div className="grid grid-cols-2 gap-1 border-b border-white/8 p-2">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`rounded-xl py-2.5 text-sm font-semibold transition ${
                mode === "login"
                  ? "bg-cyan-400 text-ink-950"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`rounded-xl py-2.5 text-sm font-semibold transition ${
                mode === "signup"
                  ? "bg-cyan-400 text-ink-950"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              Sign Up
            </button>
          </div>
        )}

        <div className="overflow-y-auto px-5 py-5">
          <h2 id="auth-modal-title" className="text-xl font-bold text-white">
            {copy.title}
          </h2>
          <p className="mt-1 text-sm text-slate-400">{copy.subtitle}</p>

          <div className="mt-5">
            {mode === "login" && (
              <LoginForm
                showSwitch
                onForgot={() => setMode("forgot")}
                onSwitchSignup={() => setMode("signup")}
                onSuccess={closeAuth}
              />
            )}
            {mode === "signup" && (
              <Suspense fallback={<p className="text-sm text-slate-400">Loading…</p>}>
                <SignupForm
                  showSwitch
                  onSwitchLogin={() => setMode("login")}
                  onSuccess={closeAuth}
                />
              </Suspense>
            )}
            {mode === "forgot" && (
              <ForgotForm onBack={() => setMode("login")} />
            )}
          </div>

          {mode !== "forgot" && (
            <p className="mt-5 text-[11px] leading-relaxed text-slate-500">
              By continuing, you agree to our Terms of Service and Privacy
              Policy. Multiple accounts, VPNs, and emulators are not allowed.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
