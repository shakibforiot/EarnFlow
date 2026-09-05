"use client";

import { useEffect, useState } from "react";
import { OfferCard, SectionHeader } from "@/components/dashboard/OfferCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/Button";
import { getSession } from "@/lib/session";
import { useSiteCatalog } from "@/hooks/useSiteCatalog";
import { formatCoins } from "@/data/dashboard";

type Provider = {
  id: "adgem" | "pubscale";
  name: string;
  description: string;
  enabled: boolean;
  accent: string;
  launchUrl: string | null;
};

type HistorySummary = {
  creditCount: number;
  chargebackCount: number;
  creditedCoins: number;
  reversedCoins: number;
  netCoins: number;
  risk: "low" | "medium" | "high";
};

export default function OffersPage() {
  const catalog = useSiteCatalog();
  const allOffers = [...catalog.offers].sort((a, b) => b.reward - a.reward);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [providers, setProviders] = useState<Provider[]>([]);
  const [rateNote, setRateNote] = useState("");
  const [summary, setSummary] = useState<HistorySummary | null>(null);
  const [chargebacks, setChargebacks] = useState<
    { txid: string; coins: number; at: string }[]
  >([]);
  const [busyProvider, setBusyProvider] = useState<string | null>(null);
  const [embed, setEmbed] = useState<{
    provider: Provider;
    url: string;
  } | null>(null);
  const [setupTips, setSetupTips] = useState<string[]>([]);

  useEffect(() => {
    const session = getSession();
    if (!session) return;
    void fetch(`/api/offers/complete?userId=${session.id}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setCompleted(new Set(data.completed ?? [])))
      .catch(() => undefined);

    void fetch(`/api/offerwall/launch?userId=${session.id}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        setProviders(data.providers ?? []);
        setRateNote(data.rateNote || "");
      })
      .catch(() => undefined);

    void fetch(`/api/offerwall/history?userId=${session.id}`, {
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((data) => {
        setSummary(data.summary ?? null);
        setChargebacks(data.chargebacks ?? []);
      })
      .catch(() => undefined);

    void fetch("/api/offerwall/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setSetupTips(data.tips ?? []))
      .catch(() => undefined);
  }, []);

  async function resolveUrl(provider: Provider) {
    const session = getSession();
    if (!session) return null;
    const res = await fetch("/api/offerwall/launch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: session.id, provider: provider.id }),
    });
    const data = await res.json();
    if (!res.ok || !data.url) {
      window.alert(data.error || "Offerwall not configured yet.");
      return null;
    }
    return data.url as string;
  }

  async function openWall(provider: Provider, mode: "tab" | "embed") {
    setBusyProvider(provider.id);
    try {
      const url = await resolveUrl(provider);
      if (!url) return;
      if (mode === "embed") {
        setEmbed({ provider, url });
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch {
      window.alert("Could not open offerwall.");
    } finally {
      setBusyProvider(null);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Offers</h1>
        <p className="mt-1 text-sm text-slate-400">
          Partner offerwalls + admin catalog. Coins credit after secure postback.
        </p>
        {rateNote && (
          <p className="mt-2 text-xs text-cyan-300/90">{rateNote}</p>
        )}
      </div>

      <section>
        <SectionHeader title="Partner offerwalls" />
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {providers.map((p) => (
            <article
              key={p.id}
              className={`rounded-2xl border border-white/10 bg-gradient-to-br ${p.accent} p-5`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-white">{p.name}</h3>
                  <p className="mt-1 text-sm text-slate-300">{p.description}</p>
                </div>
                <span
                  className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold uppercase ${
                    p.enabled
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-white/10 text-slate-400"
                  }`}
                >
                  {p.enabled ? "Ready" : "Setup"}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  disabled={busyProvider === p.id}
                  onClick={() => void openWall(p, "embed")}
                >
                  {busyProvider === p.id ? "Loading…" : "Embed here"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busyProvider === p.id}
                  onClick={() => void openWall(p, "tab")}
                >
                  Open tab
                </Button>
              </div>
            </article>
          ))}
        </div>
        {providers.length === 0 && (
          <EmptyState
            title="Loading partners…"
            description="AdGem / PubScale walls appear here when the API responds."
          />
        )}
        {setupTips.length > 0 && providers.some((p) => !p.enabled) && (
          <ul className="mt-3 space-y-1 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-100/90">
            {setupTips.map((t) => (
              <li key={t}>• {t}</li>
            ))}
          </ul>
        )}
      </section>

      {embed && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SectionHeader title={`${embed.provider.name} · embedded`} />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  window.open(embed.url, "_blank", "noopener,noreferrer")
                }
              >
                New tab
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEmbed(null)}>
                Close
              </Button>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-ink-950">
            <iframe
              title={embed.provider.name}
              src={embed.url}
              className="h-[70vh] min-h-[420px] w-full bg-white"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <p className="text-[11px] text-slate-500">
            Some partners block iframes — use Open tab if the frame stays blank.
          </p>
        </section>
      )}

      {summary && (
        <section className="rounded-2xl border border-white/10 bg-ink-900/60 p-4">
          <SectionHeader title="Wall activity" />
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <p className="text-[10px] uppercase text-slate-500">Credits</p>
              <p className="font-bold text-white">{summary.creditCount}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-slate-500">Chargebacks</p>
              <p className="font-bold text-amber-300">{summary.chargebackCount}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-slate-500">Net coins</p>
              <p className="font-bold text-cyan-300">
                {formatCoins(summary.netCoins)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-slate-500">Risk</p>
              <p
                className={`font-bold capitalize ${
                  summary.risk === "high"
                    ? "text-red-300"
                    : summary.risk === "medium"
                      ? "text-amber-300"
                      : "text-emerald-300"
                }`}
              >
                {summary.risk}
              </p>
            </div>
          </div>
          {chargebacks.length > 0 && (
            <ul className="mt-4 space-y-2">
              {chargebacks.slice(0, 5).map((c) => (
                <li
                  key={c.txid + String(c.at)}
                  className="flex justify-between gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs"
                >
                  <span className="truncate text-slate-400">
                    Reversed · {c.txid.slice(0, 12)}…
                  </span>
                  <span className="font-semibold text-red-300">
                    −{formatCoins(c.coins)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section>
        <SectionHeader title={`${allOffers.length} catalog offers`} />
        {allOffers.length === 0 ? (
          <EmptyState
            title="No catalog offers yet"
            description="Use partner walls above, or admin can add offers from Admin → Catalog."
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
