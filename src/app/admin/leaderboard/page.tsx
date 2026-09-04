"use client";

import { useEffect, useState } from "react";
import { AdminShell, useAdmin } from "@/components/admin/AdminProvider";
import { Badge, Field, adminInput } from "@/components/admin/AdminUI";
import { Button } from "@/components/Button";
import { formatCoins } from "@/data/dashboard";
import type { AdminSettings } from "@/lib/admin-types";

type Prize = { place: number; coins: number; label: string };

const defaultPrizes: Prize[] = [
  { place: 1, coins: 5000, label: "1st place" },
  { place: 2, coins: 2500, label: "2nd place" },
  { place: 3, coins: 1000, label: "3rd place" },
  { place: 4, coins: 500, label: "4th place" },
  { place: 5, coins: 250, label: "5th place" },
];

export default function AdminLeaderboardPage() {
  const { settings, patchSettings, busy, api, flash, setError } = useAdmin();
  const [enabled, setEnabled] = useState(true);
  const [title, setTitle] = useState("Weekly top earners");
  const [limit, setLimit] = useState(20);
  const [prizes, setPrizes] = useState<Prize[]>(defaultPrizes);
  const [preview, setPreview] = useState<
    { rank: number; user: string; coins: number; prize: string }[]
  >([]);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setEnabled(settings.leaderboardEnabled !== false);
    setTitle(settings.leaderboardTitle || "Weekly top earners");
    setLimit(settings.leaderboardLimit || 20);
    setPrizes(
      settings.rankPrizes?.length
        ? [...settings.rankPrizes].sort((a, b) => a.place - b.place)
        : defaultPrizes,
    );
  }, [settings]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/leaderboard", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled) setPreview(data.rows ?? []);
      } catch {
        if (!cancelled) setPreview([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [settings?.rankPrizes, settings?.leaderboardLimit, settings?.leaderboardEnabled]);

  function updatePrize(idx: number, patch: Partial<Prize>) {
    setPrizes((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  }

  function addPrize() {
    const place = prizes.length ? Math.max(...prizes.map((p) => p.place)) + 1 : 1;
    setPrizes((prev) => [
      ...prev,
      { place, coins: 100, label: `${place}th place` },
    ]);
  }

  function removePrize(idx: number) {
    setPrizes((prev) => prev.filter((_, i) => i !== idx));
  }

  async function save() {
    const cleaned = prizes
      .map((p) => ({
        place: Math.max(1, Math.round(Number(p.place) || 1)),
        coins: Math.max(0, Math.round(Number(p.coins) || 0)),
        label: p.label.trim() || `${p.place} place`,
      }))
      .sort((a, b) => a.place - b.place);

    await patchSettings({
      leaderboardEnabled: enabled,
      leaderboardTitle: title.trim() || "Leaderboard",
      leaderboardLimit: Math.min(50, Math.max(5, Number(limit) || 20)),
      rankPrizes: cleaned,
    } as Partial<AdminSettings>);
  }

  async function payPrizes(force = false) {
    if (
      !window.confirm(
        force
          ? "Force pay rank prizes again to current top users?"
          : "Pay current leaderboard prizes to top users now?",
      )
    )
      return;
    setPaying(true);
    const res = await api<{ paid?: { place: number; user: string; coins: number }[]; error?: string }>(
      "/api/admin/leaderboard/payout",
      { method: "POST", json: { force } },
    );
    setPaying(false);
    if (!res.ok) {
      setError(res.data.error || "Payout failed");
      return;
    }
    flash(`Paid ${res.data.paid?.length || 0} prize(s)`);
  }

  return (
    <AdminShell
      title="Leaderboard"
      subtitle="Custom rank prizes shown on /dashboard/leaderboard"
      actions={
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => void payPrizes(false)}
            disabled={busy || paying}
          >
            {paying ? "Paying…" : "Pay prizes now"}
          </Button>
          <Button size="sm" variant="primary" onClick={() => void save()} disabled={busy}>
            Save prizes
          </Button>
        </div>
      }
    >
      <div className="animate-fade-up space-y-4">
        <section className="grid gap-4 rounded-2xl border border-white/10 bg-ink-900/60 p-4 lg:grid-cols-3">
          <Field label="Board title">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={adminInput}
              placeholder="Weekly top earners"
            />
          </Field>
          <Field label="How many ranks to show">
            <input
              type="number"
              min={5}
              max={50}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className={adminInput}
            />
          </Field>
          <label className="flex items-end gap-2 pb-1 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            Leaderboard enabled
          </label>
        </section>

        <section className="rounded-2xl border border-white/10 bg-ink-900/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-semibold text-white">Custom prizes</h3>
              <p className="text-xs text-slate-500">
                Place # · coin reward · label (shown on user ranks page)
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={addPrize}>
              + Add place
            </Button>
          </div>

          <div className="mt-4 space-y-2">
            {prizes.map((p, idx) => (
              <div
                key={`${p.place}-${idx}`}
                className="grid gap-2 rounded-xl border border-white/8 bg-ink-950/50 p-3 sm:grid-cols-[70px_120px_1fr_auto] sm:items-center"
              >
                <Field label="Place">
                  <input
                    type="number"
                    min={1}
                    value={p.place}
                    onChange={(e) =>
                      updatePrize(idx, { place: Number(e.target.value) })
                    }
                    className={adminInput}
                  />
                </Field>
                <Field label="Coins">
                  <input
                    type="number"
                    min={0}
                    value={p.coins}
                    onChange={(e) =>
                      updatePrize(idx, { coins: Number(e.target.value) })
                    }
                    className={adminInput}
                  />
                </Field>
                <Field label="Label">
                  <input
                    value={p.label}
                    onChange={(e) => updatePrize(idx, { label: e.target.value })}
                    className={adminInput}
                    placeholder="1st place"
                  />
                </Field>
                <button
                  type="button"
                  onClick={() => removePrize(idx)}
                  className="h-10 rounded-xl px-3 text-xs font-semibold text-red-300 hover:bg-red-500/10 sm:mt-5"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Badge tone="info">{prizes.length} prize slots</Badge>
            <Badge tone="ok">
              Total pool{" "}
              {formatCoins(prizes.reduce((s, p) => s + (Number(p.coins) || 0), 0))}{" "}
              coins
            </Badge>
          </div>

          <Button
            className="mt-4"
            variant="primary"
            onClick={() => void save()}
            disabled={busy}
          >
            Save leaderboard prizes
          </Button>
        </section>

        <section className="rounded-2xl border border-white/10 bg-ink-900/60 p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-white">Live preview</h3>
            <Badge tone="neutral">user page</Badge>
          </div>
          {!preview.length ? (
            <p className="mt-3 text-sm text-slate-500">No earners yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-white/5">
              {preview.slice(0, 10).map((row) => (
                <li
                  key={row.rank}
                  className="flex items-center justify-between gap-3 py-2 text-sm"
                >
                  <span className="text-slate-400">#{row.rank}</span>
                  <span className="flex-1 font-medium text-white">{row.user}</span>
                  <span className="text-slate-400">
                    {formatCoins(row.coins)}
                  </span>
                  <span className="font-semibold text-emerald-300">{row.prize}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
