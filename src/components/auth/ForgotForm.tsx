"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/Button";

type Props = {
  onBack?: () => void;
};

export function ForgotForm({ onBack }: Props) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 400));
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-slate-300">
          If an account exists for <span className="text-white">{email}</span>,
          reset instructions will be sent.
        </p>
        {onBack ? (
          <Button variant="primary" className="w-full" onClick={onBack}>
            Back to Sign In
          </Button>
        ) : (
          <Button variant="primary" className="w-full" href="/login">
            Back to Sign In
          </Button>
        )}
      </div>
    );
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
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          className="h-11 w-full rounded-xl border border-white/10 bg-ink-950/60 px-3.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20"
        />
      </label>
      <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
        {loading ? "Sending…" : "Reset Password"}
      </Button>
      <p className="text-center text-sm text-slate-400">
        {onBack ? (
          <button
            type="button"
            className="font-medium text-cyan-300 hover:underline"
            onClick={onBack}
          >
            Back to Sign In
          </button>
        ) : (
          <Link href="/login" className="font-medium text-cyan-300 hover:underline">
            Back to Sign In
          </Link>
        )}
      </p>
    </form>
  );
}
