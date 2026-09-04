"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/Button";
import { saveSession } from "@/lib/session";

type Props = {
  onSuccess?: () => void;
  onSwitchLogin?: () => void;
  showSwitch?: boolean;
};

export function SignupForm({
  onSuccess,
  onSwitchLogin,
  showSwitch = true,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const referralCode = (searchParams.get("ref") || "").trim().toUpperCase();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!agreed) {
      setError("Please agree to the Terms and Privacy Policy.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          referralCode: referralCode || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Unable to create account.");
        return;
      }
      saveSession(data.user);
      onSuccess?.();
      router.push("/dashboard");
    } catch {
      setError("Unable to create account. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      {referralCode && (
        <p className="rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">
          Referral applied:{" "}
          <span className="font-mono font-semibold">{referralCode}</span>
        </p>
      )}
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
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Create a password"
          className="h-11 w-full rounded-xl border border-white/10 bg-ink-950/60 px-3.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20"
        />
      </label>

      <label className="flex items-start gap-2 text-xs text-slate-400">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 rounded border-white/20 bg-ink-950 text-cyan-400 focus:ring-cyan-400"
          required
        />
        <span>
          I agree to the{" "}
          <Link href="/terms" className="text-cyan-300 hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-cyan-300 hover:underline">
            Privacy Policy
          </Link>
        </span>
      </label>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {error}
        </p>
      )}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        disabled={loading}
      >
        {loading ? "Creating account…" : "Sign Up Now For Free"}
      </Button>

      {showSwitch && (
        <p className="pt-1 text-center text-sm text-slate-400">
          Already have an account?{" "}
          {onSwitchLogin ? (
            <button
              type="button"
              className="font-medium text-cyan-300 hover:underline"
              onClick={onSwitchLogin}
            >
              Sign In
            </button>
          ) : (
            <Link
              href="/login"
              className="font-medium text-cyan-300 hover:underline"
            >
              Sign In
            </Link>
          )}
        </p>
      )}
    </form>
  );
}
