"use client";

import { useEffect, useState } from "react";
import { OfferCard, SectionHeader } from "@/components/dashboard/OfferCard";
import { EmptyState } from "@/components/EmptyState";
import { getSession } from "@/lib/session";
import { useSiteCatalog } from "@/hooks/useSiteCatalog";

export default function OffersPage() {
  const catalog = useSiteCatalog();
  const allOffers = [...catalog.offers].sort((a, b) => b.reward - a.reward);
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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Offers</h1>
        <p className="mt-1 text-sm text-slate-400">
          Complete tasks and offers to earn coins.
        </p>
      </div>

      <section>
        <SectionHeader title={`${allOffers.length} available`} />
        {allOffers.length === 0 ? (
          <EmptyState
            title="No offers available"
            description="Admin can add offers from Admin → Offers."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {allOffers.map((offer) => (
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
      </section>
    </div>
  );
}
