"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AdminShell, useAdmin } from "@/components/admin/AdminProvider";
import { Badge, Field, Tiny, adminInput } from "@/components/admin/AdminUI";
import { Button } from "@/components/Button";
import { formatCoins } from "@/data/dashboard";
import type { CodeRow } from "@/lib/admin-types";

export default function AdminRedeemPage() {
  const { api, flash, setError, busy } = useAdmin();
  const [codes, setCodes] = useState<CodeRow[]>([]);
  const [newCode, setNewCode] = useState("");
  const [newCoins, setNewCoins] = useState(250);
  const [newMaxUses, setNewMaxUses] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api<{ codes?: CodeRow[]; error?: string }>(
      "/api/admin/redeem",
    );
    if (!res.ok) setError(res.data.error || "Failed to load codes");
    else setCodes(res.data.codes ?? []);
    setLoading(false);
  }, [api, setError]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createCode(e: FormEvent) {
    e.preventDefault();
    const res = await api<{ code?: CodeRow; error?: string }>(
      "/api/admin/redeem",
      {
        method: "POST",
        json: { code: newCode, coins: newCoins, maxUses: newMaxUses },
      },
    );
    if (!res.ok) {
      setError(res.data.error || "Code save failed");
      return;
    }
    setNewCode("");
    flash(`Code ${res.data.code?.code} live`);
    void load();
  }

  async function codeAction(codeId: string, action: string) {
    if (action === "delete" && !window.confirm("Delete this redeem code?"))
      return;
    const res = await api<{ error?: string }>("/api/admin/redeem", {
      method: "PATCH",
      json: { codeId, action },
    });
    if (!res.ok) {
      setError(res.data.error || "Failed");
      return;
    }
    flash(`Code ${action}`);
    void load();
  }

  return (
    <AdminShell
      title="Redeem codes"
      subtitle="Custom codes, coin amounts, and use limits"
    >
      <div className="animate-fade-up space-y-4">
        <form
          onSubmit={createCode}
          className="grid gap-3 rounded-2xl border border-white/10 bg-ink-900/60 p-4 sm:grid-cols-4"
        >
          <Field label="Code">
            <input
              value={newCode}
              onChange={(e) => setNewCode(e.target.value.toUpperCase())}
              placeholder="SUMMER500"
              className={`${adminInput} font-mono`}
              required
            />
          </Field>
          <Field label="Coins">
            <input
              type="number"
              value={newCoins}
              onChange={(e) => setNewCoins(Number(e.target.value))}
              className={adminInput}
              min={1}
            />
          </Field>
          <Field label="Max uses (0 = ∞)">
            <input
              type="number"
              value={newMaxUses}
              onChange={(e) => setNewMaxUses(Number(e.target.value))}
              className={adminInput}
              min={0}
            />
          </Field>
          <div className="flex items-end">
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={busy}
            >
              Publish code
            </Button>
          </div>
        </form>

        {loading ? (
          <p className="text-sm text-slate-500">Loading codes…</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {codes.map((c) => {
              const pct =
                c.maxUses > 0
                  ? Math.min(100, Math.round((c.usedCount / c.maxUses) * 100))
                  : 0;
              return (
                <div
                  key={c.id}
                  className="rounded-2xl border border-white/10 bg-ink-900/60 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-lg font-bold text-cyan-300">
                        {c.code}
                      </p>
                      <p className="text-xs text-slate-400">
                        {formatCoins(c.coins)} coins
                      </p>
                    </div>
                    <Badge tone={c.active ? "ok" : "bad"}>
                      {c.active ? "live" : "off"}
                    </Badge>
                  </div>
                  <div className="mt-3">
                    <div className="mb-1 flex justify-between text-[10px] text-slate-500">
                      <span>
                        Used {c.usedCount}
                        {c.maxUses > 0 ? ` / ${c.maxUses}` : " / ∞"}
                      </span>
                      {c.maxUses > 0 && <span>{pct}%</span>}
                    </div>
                    {c.maxUses > 0 && (
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Tiny onClick={() => void codeAction(c.id, "resetUses")}>
                      Reset uses
                    </Tiny>
                    <Tiny
                      onClick={() =>
                        void codeAction(
                          c.id,
                          c.active ? "deactivate" : "activate",
                        )
                      }
                    >
                      {c.active ? "Disable" : "Enable"}
                    </Tiny>
                    <Tiny danger onClick={() => void codeAction(c.id, "delete")}>
                      Delete
                    </Tiny>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
