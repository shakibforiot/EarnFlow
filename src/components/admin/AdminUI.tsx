"use client";

import type { ReactNode } from "react";

export const adminInput =
  "h-10 w-full rounded-xl border border-white/10 bg-ink-950/80 px-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/40 focus:ring-1 focus:ring-cyan-400/20";

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "ok" | "warn" | "bad" | "info";
}) {
  const map = {
    neutral: "bg-white/5 text-slate-300 border-white/10",
    ok: "bg-emerald-500/15 text-emerald-200 border-emerald-500/25",
    warn: "bg-amber-500/15 text-amber-200 border-amber-500/25",
    bad: "bg-red-500/15 text-red-200 border-red-500/25",
    info: "bg-cyan-500/15 text-cyan-200 border-cyan-500/25",
  };
  return (
    <span
      className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${map[tone]}`}
    >
      {children}
    </span>
  );
}

export function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block text-[11px] font-medium text-slate-400 ${className}`}>
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

export function Tiny({
  children,
  onClick,
  danger,
  warn,
}: {
  children: ReactNode;
  onClick: () => void;
  danger?: boolean;
  warn?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition ${
        danger
          ? "bg-red-500/15 text-red-200 hover:bg-red-500/25"
          : warn
            ? "bg-amber-500/15 text-amber-200 hover:bg-amber-500/25"
            : "bg-white/5 text-slate-300 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

export function ControlCard({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-ink-900/60 p-4">
      <h3 className="font-semibold text-white">{title}</h3>
      <p className="text-[11px] text-slate-500">{desc}</p>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-ink-950/50 p-2 text-center">
      <p className="text-[9px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-white">{value}</p>
    </div>
  );
}
