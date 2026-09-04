"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { OfferItem } from "@/data/dashboard";
import { formatUsd } from "@/data/dashboard";
import { Button } from "@/components/Button";
import { getSession, saveSession } from "@/lib/session";

export function OfferCard({
  offer,
  completed = false,
  onCompleted,
}: {
  offer: OfferItem;
  completed?: boolean;
  onCompleted?: (offerId: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(completed);
  const [error, setError] = useState("");

  async function complete() {
    setError("");
    const session = getSession();
    if (!session) {
      setError("Sign in again to claim.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/offers/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session.id, offerId: offer.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "ALREADY_DONE") {
          setDone(true);
          onCompleted?.(offer.id);
        }
        setError(data.error || "Could not complete offer.");
        return;
      }
      saveSession(data.user);
      window.dispatchEvent(new Event("earnflow-session"));
      setDone(true);
      onCompleted?.(offer.id);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-ink-900/80 shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-cyan-400/35 hover:shadow-cyan-500/10">
      <div className="relative h-36 overflow-hidden">
        <Image
          src={offer.image}
          alt={offer.title}
          fill
          className="object-cover transition duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/20 to-transparent" />
        <span className="absolute left-3 top-3 rounded-lg bg-black/50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur">
          {offer.category}
        </span>
        <span className="absolute bottom-3 right-3 rounded-lg bg-emerald-500/90 px-2.5 py-1 text-sm font-bold text-ink-950">
          {formatUsd(offer.reward)}
        </span>
        {done && (
          <span className="absolute right-3 top-3 rounded-lg bg-emerald-500/90 px-2 py-1 text-[10px] font-bold uppercase text-ink-950">
            Done
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-[11px] font-medium text-cyan-400/90">{offer.provider}</p>
        <h3 className="mt-1 text-base font-semibold leading-snug text-white">
          {offer.title}
        </h3>
        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-400">
          <span className="rounded-md bg-white/5 px-2 py-0.5">{offer.time}</span>
          <span className="rounded-md bg-white/5 px-2 py-0.5">{offer.difficulty}</span>
          <span className="rounded-md bg-white/5 px-2 py-0.5">{offer.coins} coins</span>
        </div>
        <div className="mt-4 flex flex-col items-stretch gap-2 border-t border-white/8 pt-3">
          <Button
            variant={done ? "secondary" : "primary"}
            size="sm"
            className="w-full"
            disabled={done || busy}
            onClick={complete}
          >
            {done ? "Completed" : busy ? "Crediting…" : "Complete & Claim"}
          </Button>
          {error && <p className="text-[11px] text-red-300">{error}</p>}
        </div>
      </div>
    </article>
  );
}

export function SectionHeader({
  title,
  href,
  action = "View all",
}: {
  title: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <h2 className="text-lg font-bold tracking-tight text-white sm:text-xl">
        {title}
      </h2>
      {href && (
        <Link href={href} className="text-sm font-medium text-cyan-300 hover:underline">
          {action}
        </Link>
      )}
    </div>
  );
}
