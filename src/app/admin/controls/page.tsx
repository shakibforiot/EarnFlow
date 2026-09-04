"use client";

import { useEffect, useState } from "react";
import { AdminShell, useAdmin } from "@/components/admin/AdminProvider";
import { ControlCard, Field, adminInput } from "@/components/admin/AdminUI";
import { Button } from "@/components/Button";

export default function AdminControlsPage() {
  const { settings, patchSettings, busy } = useAdmin();
  const [draft, setDraft] = useState(settings);

  useEffect(() => {
    if (settings) setDraft(settings);
  }, [settings]);

  if (!draft) {
    return (
      <AdminShell title="Controls" subtitle="Faucet, streak, cash out, kill switches">
        <p className="text-sm text-slate-500">Loading…</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title="Controls"
      subtitle="Daily Free, streak, cash out rules, and site kill switches"
    >
      <div className="animate-fade-up space-y-4">
        <div className="grid gap-4 lg:grid-cols-3">
          <ControlCard
            title="Daily Free"
            desc={`${draft.faucetCoins} coins · ${Math.round(draft.faucetCooldownSec / 60)}m`}
          >
            <Field label="Coins">
              <input
                type="number"
                value={draft.faucetCoins}
                onChange={(e) =>
                  setDraft({ ...draft, faucetCoins: Number(e.target.value) })
                }
                className={adminInput}
              />
            </Field>
            <Field label="Cooldown (sec)" className="mt-2">
              <input
                type="number"
                value={draft.faucetCooldownSec}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    faucetCooldownSec: Number(e.target.value),
                  })
                }
                className={adminInput}
              />
            </Field>
            <div className="mt-2 flex flex-wrap gap-1">
              {[
                [60, "1m"],
                [300, "5m"],
                [1800, "30m"],
                [3600, "1h"],
              ].map(([sec, label]) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() =>
                    setDraft({ ...draft, faucetCooldownSec: Number(sec) })
                  }
                  className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] text-slate-400 hover:bg-white/10"
                >
                  {label}
                </button>
              ))}
            </div>
            <Button
              size="sm"
              variant="secondary"
              className="mt-3"
              disabled={busy}
              onClick={() =>
                void patchSettings({
                  faucetCoins: draft.faucetCoins,
                  faucetCooldownSec: draft.faucetCooldownSec,
                })
              }
            >
              Save faucet
            </Button>
          </ControlCard>

          <ControlCard
            title="Streak"
            desc={draft.streakEnabled ? "Enabled" : "Disabled"}
          >
            <Field label="Day-1 base coins">
              <input
                type="number"
                value={draft.streakBaseReward}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    streakBaseReward: Number(e.target.value),
                  })
                }
                className={adminInput}
              />
            </Field>
            <label className="mt-3 flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={draft.streakEnabled}
                onChange={(e) =>
                  setDraft({ ...draft, streakEnabled: e.target.checked })
                }
              />
              Streak enabled
            </label>
            <Button
              size="sm"
              variant="secondary"
              className="mt-3"
              disabled={busy}
              onClick={() =>
                void patchSettings({
                  streakBaseReward: draft.streakBaseReward,
                  streakEnabled: draft.streakEnabled,
                })
              }
            >
              Save streak
            </Button>
          </ControlCard>

          <ControlCard
            title="Cash out"
            desc={`Min $${draft.minCashoutUsd} · 1000 coins = $1`}
          >
            <p className="mb-2 text-[11px] text-slate-500">
              Fixed rate: <span className="text-cyan-300">1000 coins = $1.00</span>
            </p>
            <Field label="Minimum USD">
              <input
                type="number"
                value={draft.minCashoutUsd}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    minCashoutUsd: Number(e.target.value),
                  })
                }
                className={adminInput}
              />
            </Field>
            <label className="mt-3 flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={draft.cashoutEnabled}
                onChange={(e) =>
                  setDraft({ ...draft, cashoutEnabled: e.target.checked })
                }
              />
              Cash out enabled
            </label>
            <Button
              size="sm"
              variant="secondary"
              className="mt-3"
              disabled={busy}
              onClick={() =>
                void patchSettings({
                  minCashoutUsd: draft.minCashoutUsd,
                  cashoutEnabled: draft.cashoutEnabled,
                })
              }
            >
              Save cash out
            </Button>
          </ControlCard>
        </div>

        <section className="rounded-2xl border border-white/10 bg-ink-900/60 p-5">
          <h3 className="font-semibold text-white">Offerwall postback</h3>
          <p className="mt-1 text-xs text-slate-400">
            Partner S2S:{" "}
            <code className="text-cyan-300">
              /api/offerwall/postback?uid=&amp;coins=&amp;txid=&amp;secret=
            </code>
            . Prefer env <code className="text-slate-300">OFFERWALL_SECRET</code>
            {(draft as { offerwallSecretSet?: boolean }).offerwallSecretSet
              ? " · settings secret is set"
              : ""}
            .
          </p>
          <Field label="Set / replace settings secret" className="mt-3">
            <input
              type="password"
              id="offerwall-secret-input"
              className={adminInput}
              placeholder="New secret (leave blank to keep)"
            />
          </Field>
          <Button
            size="sm"
            variant="secondary"
            className="mt-3"
            disabled={busy}
            onClick={() => {
              const el = document.getElementById(
                "offerwall-secret-input",
              ) as HTMLInputElement | null;
              const val = el?.value?.trim();
              if (!val) return;
              void patchSettings({ offerwallSecret: val } as never);
              if (el) el.value = "";
            }}
          >
            Save offerwall secret
          </Button>
        </section>

        <section className="rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-500/10 to-ink-900/80 p-5">
          <h3 className="font-semibold text-red-100">Kill switches</h3>
          <p className="mt-1 text-xs text-slate-400">
            Maintenance = friendly downtime. Fake 500 = Internal Server Error for
            everyone except /admin pages.
          </p>
          <Field label="Maintenance message" className="mt-3">
            <input
              value={draft.maintenanceMessage}
              onChange={(e) =>
                setDraft({ ...draft, maintenanceMessage: e.target.value })
              }
              className={adminInput}
            />
          </Field>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={draft.maintenanceMode ? "primary" : "outline"}
              disabled={busy}
              onClick={() => {
                if (
                  !draft.maintenanceMode &&
                  !window.confirm("Put the whole site into maintenance?")
                )
                  return;
                void patchSettings({
                  maintenanceMode: !draft.maintenanceMode,
                  maintenanceMessage: draft.maintenanceMessage,
                });
              }}
            >
              {draft.maintenanceMode
                ? "Disable maintenance"
                : "Enable maintenance"}
            </Button>
            <Button
              size="sm"
              variant={draft.forceErrorMode ? "primary" : "outline"}
              disabled={busy}
              onClick={() => {
                if (
                  !draft.forceErrorMode &&
                  !window.confirm("Force fake 500 site-wide?")
                )
                  return;
                void patchSettings({
                  forceErrorMode: !draft.forceErrorMode,
                });
              }}
            >
              {draft.forceErrorMode ? "Disable fake 500" : "Enable fake 500"}
            </Button>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
