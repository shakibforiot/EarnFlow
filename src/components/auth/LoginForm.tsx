"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { saveSession } from "@/lib/session";

type Props = {
  onSuccess?: () => void;
  onForgot?: () => void;
  onSwitchSignup?: () => void;
  /** When true, show footer switch links */
  showSwitch?: boolean;
};

export function LoginForm({
  onSuccess,
  onForgot,
  onSwitchSignup,
  showSwitch = true,
}: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Unable to sign in.");
        return;
      }
      saveSession(data.user);
      onSuccess?.();
      router.push("/dashboard");
    } catch {
      setError("Unable to sign in. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-slate-400">
          Email address
        </span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          className="h-11 w-full rounded-xl border border-white/10 bg-ink-950/60 px-3.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-slate-400">
          Password
        </span>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="h-11 w-full rounded-xl border border-white/10 bg-ink-950/60 px-3.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20"
        />
      </label>

      <div className="flex justify-end">
        {onForgot ? (
          <button
            type="button"
            className="text-xs text-cyan-300 hover:underline"
            onClick={onForgot}
          >
            Forgot Password?
          </button>
        ) : (
          <Link href="/login?forgot=1" className="text-xs text-cyan-300 hover:underline">
            Forgot Password?
          </Link>
        )}
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {error}
        </p>
      )}

      <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
        {loading ? "Signing in…" : "Sign In"}
      </Button>

      {showSwitch && (
        <p className="pt-1 text-center text-sm text-slate-400">
          Don&apos;t have an account?{" "}
          {onSwitchSignup ? (
            <button
              type="button"
              className="font-medium text-cyan-300 hover:underline"
              onClick={onSwitchSignup}
            >
              Sign Up
            </button>
          ) : (
            <Link href="/signup" className="font-medium text-cyan-300 hover:underline">
              Sign Up
            </Link>
          )}
        </p>
      )}
    </form>
  );
}
