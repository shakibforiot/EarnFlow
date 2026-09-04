"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { getSession } from "@/lib/session";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setOk(false);
    try {
      const session = getSession();
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          subject,
          message,
          userId: session?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not send message");
        return;
      }
      setOk(true);
      setSubject("");
      setMessage("");
    } catch {
      setError("Could not send message. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
      <div className="space-y-4 text-slate-300">
        <p>
          For fastest help after you create an account, use{" "}
          <strong className="text-white">Live Support</strong> in the dashboard
          (bot + admin).
        </p>
        <ul className="space-y-2 text-sm">
          <li>
            <span className="text-slate-500">Email:</span>{" "}
            <a
              href="mailto:support@earnflow.app"
              className="text-cyan-300 hover:underline"
            >
              support@earnflow.app
            </a>
          </li>
          <li>
            <span className="text-slate-500">Legal:</span>{" "}
            <a href="/terms" className="text-cyan-300 hover:underline">
              Terms
            </a>
            {" · "}
            <a href="/privacy" className="text-cyan-300 hover:underline">
              Privacy
            </a>
          </li>
          <li>
            <span className="text-slate-500">Company:</span>{" "}
            <a href="/about" className="text-cyan-300 hover:underline">
              About EarnFlow
            </a>
          </li>
        </ul>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-3 rounded-2xl border border-white/10 bg-ink-900/50 p-5"
      >
        <label className="block">
          <span className="mb-1 block text-xs text-slate-400">Name</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-11 w-full rounded-xl border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none focus:border-cyan-400/40"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-400">Email</span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 w-full rounded-xl border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none focus:border-cyan-400/40"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-400">Subject</span>
          <input
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="h-11 w-full rounded-xl border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none focus:border-cyan-400/40"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-400">Message</span>
          <textarea
            required
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400/40"
          />
        </label>
        {error && <p className="text-sm text-red-300">{error}</p>}
        {ok && (
          <p className="text-sm text-emerald-300">
            Message sent. We&apos;ll get back to you soon.
          </p>
        )}
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? "Sending…" : "Send message"}
        </Button>
      </form>
    </div>
  );
}
