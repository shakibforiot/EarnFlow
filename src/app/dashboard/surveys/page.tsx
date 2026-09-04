"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { OfferCard, SectionHeader } from "@/components/dashboard/OfferCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/Button";
import { getSession } from "@/lib/session";
import { useSiteCatalog } from "@/hooks/useSiteCatalog";
import { Reveal } from "@/components/Reveal";
import type { OfferItem } from "@/data/dashboard";

export default function SurveysPage() {
  const catalog = useSiteCatalog();
  const fromSurveys = (catalog.surveys || []).map(
    (s) =>
      ({
        id: String((s as { id?: string }).id || ""),
        title: String((s as { title?: string }).title || "Survey"),
        provider: String((s as { provider?: string }).provider || "Survey"),
        reward: Number((s as { reward?: number }).reward) || 0,
        coins:
          Number((s as { coins?: number }).coins) ||
          Math.round((Number((s as { reward?: number }).reward) || 0) * 1000),
        category: "survey" as const,
        time: String((s as { time?: string }).time || "10 min"),
        difficulty: "Easy" as const,
        image: String((s as { image?: string }).image || ""),
      }) satisfies OfferItem,
  );
  const surveys = (
    fromSurveys.length
      ? fromSurveys
      : catalog.offers.filter((o) => o.category === "survey")
  ).sort((a, b) => b.reward - a.reward || b.coins - a.coins);
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
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-900 via-ink-900 to-sky-950/40 p-6">
          <div
            className="pointer-events-none absolute -right-8 top-0 h-32 w-32 rounded-full bg-sky-500/20 blur-3xl animate-float"
            aria-hidden
          />
          <h1 className="relative font-display text-2xl font-bold text-white sm:text-3xl">
            Surveys
          </h1>
          <p className="relative mt-1 max-w-xl text-sm text-slate-400">
            Short research tasks with quick coin rewards. Answer honestly —
            partners may screen for quality.
          </p>
          <p className="relative mt-3 text-[11px] text-cyan-200/80">
            Tip: complete profile + email verify for higher approval rates.
          </p>
        </div>
      </Reveal>

      <SectionHeader title={`${surveys.length} available surveys`} />
      {surveys.length === 0 ? (
        <EmptyState
          title="No surveys yet"
          description="Add surveys from Admin → Offers (category: Survey) or Surveys list in Catalog."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {surveys.map((offer) => (
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
        Prefer games?{" "}
        <Link href="/dashboard/games" className="text-cyan-300 hover:underline">
          Open Games
        </Link>
        {" · "}
        <Button variant="ghost" size="sm" href="/dashboard/profile">
          Finish profile
        </Button>
      </div>
    </div>
  );
}
