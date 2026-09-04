"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { formatCoins } from "@/data/dashboard";
import { getSession, type SessionUser } from "@/lib/session";
import { ago } from "@/lib/admin-types";

type Invite = {
  id: string;
  name: string;
  email: string;
  joinedAt: string;
  balance: number;
};

export default function ReferPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [copied, setCopied] = useState(false);
  const [invited, setInvited] = useState<Invite[]>([]);
  const [invitedCount, setInvitedCount] = useState(0);
  const [bonusEarned, setBonusEarned] = useState(0);

  useEffect(() => {
    const session = getSession();
    setUser(session);
    if (!session?.id) return;
    (async () => {
      try {
        const res = await fetch(`/api/referral?userId=${session.id}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (res.ok) {
          setInvited(data.invited || []);
          setInvitedCount(data.invitedCount || 0);
          setBonusEarned(data.bonusEarned || 0);
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const code = user ? `EF${user.id.slice(-6).toUpperCase()}` : "—";
  const link =
    typeof window !== "undefined" && user
      ? `${window.location.origin}/signup?ref=${code}`
      : `/signup?ref=${code}`;

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Refer & Earn</h1>
        <p className="mt-1 text-sm text-slate-400">
          Invite friends with your code. Earn bonus coins when they join.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/10 bg-ink-900/60 p-4">
          <p className="text-[11px] text-slate-500">Friends joined</p>
          <p className="mt-1 text-2xl font-bold text-white">{invitedCount}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-ink-900/60 p-4">
          <p className="text-[11px] text-slate-500">Bonus earned</p>
          <p className="mt-1 text-2xl font-bold text-emerald-300">
            {formatCoins(bonusEarned)}
          </p>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-900 via-ink-900 to-cyan-950/40 p-6 sm:p-8">
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-cyan-500/20 blur-3xl"
          aria-hidden
        />
        <p className="relative text-xs font-medium uppercase tracking-wide text-slate-400">
          Your referral code
        </p>
        <p className="relative mt-2 font-mono text-3xl font-bold tracking-wider text-cyan-300">
          {code}
        </p>
        <div className="relative mt-5 space-y-3">
          <div className="rounded-xl border border-white/10 bg-ink-950/60 px-3 py-3 text-sm text-slate-300 break-all">
            {link}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => copy(link)}>
              {copied ? "Copied!" : "Copy invite link"}
            </Button>
            <Button variant="outline" onClick={() => copy(code)}>
              Copy code
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-ink-900/60 p-5">
        <h2 className="text-sm font-semibold text-white">How referrals work</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-400">
          <li>1. Share your link or code with friends.</li>
          <li>2. They sign up using your referral (+50 coins for them).</li>
          <li>3. You earn +100 coins when they create an account.</li>
        </ul>
      </div>

      <div className="rounded-2xl border border-white/10 bg-ink-900/60 p-5">
        <h2 className="text-sm font-semibold text-white">Your invites</h2>
        {!invited.length ? (
          <p className="mt-3 text-sm text-slate-500">No friends joined yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-white/5">
            {invited.map((u) => (
              <li
                key={u.id}
                className="flex items-center justify-between gap-3 py-2.5 text-sm"
              >
                <div>
                  <p className="font-medium text-white">{u.name}</p>
                  <p className="text-[11px] text-slate-500">
                    {u.email} · {ago(u.joinedAt)}
                  </p>
                </div>
                <span className="text-cyan-300">{formatCoins(u.balance)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
