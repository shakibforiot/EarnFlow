"use client";

import { useEffect, useState } from "react";
import type { OfferItem, OfferWall } from "@/data/dashboard";

export type SiteCatalog = {
  offers: OfferItem[];
  offerWalls: OfferWall[];
  surveys: OfferItem[];
  faucetCoins: number;
  faucetCooldownSec: number;
  minCashoutUsd: number;
  cashoutEnabled: boolean;
  landingHeadline: string;
  landingSubheadline: string;
  landingCta: string;
  rankPrizes: { place: number; coins: number; label: string }[];
  loaded: boolean;
};

const defaults: SiteCatalog = {
  offers: [],
  offerWalls: [],
  surveys: [],
  faucetCoins: 100,
  faucetCooldownSec: 1800,
  minCashoutUsd: 5,
  cashoutEnabled: true,
  landingHeadline: "Get paid for tasks, surveys, and offers.",
  landingSubheadline:
    "Collect coins, redeem promo codes, and cash out through PayPal, crypto, and gift cards.",
  landingCta: "Sign Up Free",
  rankPrizes: [],
  loaded: false,
};

function asOffer(raw: Record<string, unknown>): OfferItem {
  return {
    id: String(raw.id || ""),
    title: String(raw.title || "Offer"),
    provider: String(raw.provider || "Admin"),
    reward: Number(raw.reward ?? raw.coins ?? 0),
    coins: Number(raw.coins ?? raw.reward ?? 0),
    category: (raw.category as OfferItem["category"]) || "offer",
    time: String(raw.time || "10 min"),
    difficulty: (raw.difficulty as OfferItem["difficulty"]) || "Easy",
    featured: Boolean(raw.featured),
    image: String(raw.image || ""),
  };
}

function asWall(raw: Record<string, unknown>): OfferWall {
  return {
    id: String(raw.id || ""),
    name: String(raw.name || "Wall"),
    description: String(raw.description || ""),
    offers: Number(raw.offers || 0),
    accent: String(raw.accent || "from-cyan-500/20"),
    image: String(raw.image || ""),
  };
}

export function useSiteCatalog(): SiteCatalog {
  const [catalog, setCatalog] = useState<SiteCatalog>(defaults);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/settings", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const offers = ((data.offers as Record<string, unknown>[]) || []).map(
          asOffer,
        );
        const surveysRaw = (
          (data.surveys as Record<string, unknown>[]) || []
        ).map(asOffer);
        setCatalog({
          offers,
          offerWalls: (
            (data.offerWalls as Record<string, unknown>[]) || []
          ).map(asWall),
          surveys:
            surveysRaw.length > 0
              ? surveysRaw
              : offers.filter((o) => o.category === "survey"),
          faucetCoins: Number(data.faucetCoins) || 100,
          faucetCooldownSec: Number(data.faucetCooldownSec) || 1800,
          minCashoutUsd: Number(data.minCashoutUsd) || 5,
          cashoutEnabled: data.cashoutEnabled !== false,
          landingHeadline:
            data.landingHeadline || defaults.landingHeadline,
          landingSubheadline:
            data.landingSubheadline || defaults.landingSubheadline,
          landingCta: data.landingCta || defaults.landingCta,
          rankPrizes: data.rankPrizes || [],
          loaded: true,
        });
      } catch {
        if (!cancelled) setCatalog((c) => ({ ...c, loaded: true }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return catalog;
}
