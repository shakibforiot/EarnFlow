"use client";

import { useEffect, useState } from "react";
import { AdminShell, useAdmin } from "@/components/admin/AdminProvider";
import { Badge, adminInput } from "@/components/admin/AdminUI";
import { Button } from "@/components/Button";
import type { AdminSettings } from "@/lib/admin-types";

export default function AdminCatalogPage() {
  const { settings, patchSettings, busy } = useAdmin();
  const [draft, setDraft] = useState<AdminSettings | null>(null);
  const [offerTitle, setOfferTitle] = useState("");
  const [offerCoins, setOfferCoins] = useState(100);
  const [offerCat, setOfferCat] = useState<"offer" | "survey" | "game">("offer");
  const [offerFeatured, setOfferFeatured] = useState(true);
  const [offerProvider, setOfferProvider] = useState("Admin");

  useEffect(() => {
    if (settings) setDraft(settings);
  }, [settings]);

  if (!draft) {
    return (
      <AdminShell title="Catalog" subtitle="Offers, surveys, games">
        <p className="text-sm text-slate-500">Loading…</p>
      </AdminShell>
    );
  }

  function addOffer() {
    if (!offerTitle.trim()) return;
    const id = `offer-${Date.now()}`;
    const row = {
      id,
      title: offerTitle.trim(),
      provider: offerProvider.trim() || "Admin",
      reward: offerCoins,
      coins: offerCoins,
      category: offerCat,
      time: "10 min",
      difficulty: "Easy" as const,
      featured: offerFeatured,
      image: "",
    };
    if (offerCat === "survey") {
      void patchSettings({
        surveys: [
          ...(draft!.surveys || []),
          {
            id,
            title: row.title,
            provider: row.provider,
            reward: offerCoins,
            coins: offerCoins,
            time: "10 min",
            image: "",
          },
        ] as never,
        offers: [...(draft!.offers || []), row] as never,
      });
    } else {
      void patchSettings({
        offers: [...(draft!.offers || []), row] as never,
      });
    }
    setOfferTitle("");
  }

  return (
    <AdminShell title="Catalog" subtitle="Offers, surveys, and games">
      <div className="animate-fade-up space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge tone="ok">{(draft.offers || []).length} offers</Badge>
          <Badge tone="neutral">{(draft.surveys || []).length} surveys</Badge>
        </div>

        <section className="rounded-2xl border border-white/10 bg-ink-900/60 p-4">
          <h3 className="font-semibold text-white">Add offer / survey / game</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <input
              value={offerTitle}
              onChange={(e) => setOfferTitle(e.target.value)}
              placeholder="Title"
              className={adminInput}
            />
            <input
              value={offerProvider}
              onChange={(e) => setOfferProvider(e.target.value)}
              placeholder="Provider"
              className={adminInput}
            />
            <input
              type="number"
              value={offerCoins}
              onChange={(e) => setOfferCoins(Number(e.target.value))}
              className={adminInput}
            />
            <select
              value={offerCat}
              onChange={(e) =>
                setOfferCat(e.target.value as "offer" | "survey" | "game")
              }
              className={adminInput}
            >
              <option value="offer">Offer</option>
              <option value="survey">Survey</option>
              <option value="game">Game</option>
            </select>
            <label className="flex items-center gap-2 text-sm text-slate-300 sm:col-span-2">
              <input
                type="checkbox"
                checked={offerFeatured}
                onChange={(e) => setOfferFeatured(e.target.checked)}
              />
              Featured on dashboard
            </label>
            <Button
              type="button"
              variant="primary"
              onClick={addOffer}
              disabled={busy}
            >
              Add
            </Button>
          </div>

          <ul className="mt-4 max-h-72 space-y-1 overflow-y-auto">
            {(draft.offers || []).map((o) => {
              const id = String((o as { id?: string }).id);
              return (
                <li
                  key={id}
                  className="flex items-center justify-between rounded-lg bg-ink-950/50 px-2 py-1.5 text-xs text-slate-300"
                >
                  <span>
                    {String((o as { title?: string }).title)} ·{" "}
                    {String((o as { category?: string }).category)} ·{" "}
                    {String((o as { coins?: number }).coins)}c
                  </span>
                  <button
                    type="button"
                    className="text-red-300"
                    onClick={() => {
                      void patchSettings({
                        offers: (draft.offers || []).filter(
                          (x) => String((x as { id?: string }).id) !== id,
                        ) as never,
                        surveys: (draft.surveys || []).filter(
                          (x) => String((x as { id?: string }).id) !== id,
                        ) as never,
                      });
                    }}
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="rounded-2xl border border-dashed border-white/10 bg-ink-900/40 p-4">
          <h3 className="font-semibold text-white">Rank prizes moved</h3>
          <p className="mt-1 text-sm text-slate-400">
            Customize leaderboard prizes from{" "}
            <a href="/admin/leaderboard" className="text-cyan-300 hover:text-cyan-200">
              Admin → Leaderboard
            </a>
            .
          </p>
        </section>
      </div>
    </AdminShell>
  );
}
