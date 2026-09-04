"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { OfferCard, SectionHeader } from "@/components/dashboard/OfferCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/Button";
import { getSession } from "@/lib/session";
import { useSiteCatalog } from "@/hooks/useSiteCatalog";
import { Reveal } from "@/components/Reveal";

export default function GamesPage() {
  const catalog = useSiteCatalog();
  const games = catalog.offers
    .filter((o) => o.category === "game")
    .sort((a, b) => b.reward - a.reward);
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  useEffect(() => {
    const session = getSession();
    if (!session) return;
    void fetch(`/api/offers/complete?userId=${session.id}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setCompleted(new Set(data.completed ?? [])))
      .catch(() => undefined);
  }, []);

  return (
    <div className="space-y-6">
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-900 via-ink-900 to-emerald-950/30 p-6">
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
            Games
          </h1>
          <p className="mt-1 max-w-xl text-sm text-slate-400">
            Play, hit milestones, unlock bigger coin bonuses.
          </p>
        </div>
      </Reveal>

      <SectionHeader title={`${games.length} game offers`} />
      {games.length === 0 ? (
        <EmptyState
          title="No game offers yet"
          description="Add games from Admin → Offers (category: Game)."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {games.map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              completed={completed.has(offer.id)}
              onCompleted={(id) =>
                setCompleted((prev) => new Set([...prev, id]))
              }
            />
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-dashed border-white/10 bg-ink-900/40 p-4 text-sm text-slate-400">
        Looking for surveys?{" "}
        <Link href="/dashboard/surveys" className="text-cyan-300 hover:underline">
          Open Surveys
        </Link>
        {" · "}
        <Button variant="ghost" size="sm" href="/dashboard/offers">
          All offers
        </Button>
      </div>
    </div>
  );
}
