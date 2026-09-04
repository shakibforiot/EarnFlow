"use client";

import type { ReactNode } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { MobileNav } from "@/components/MobileNav";

export function SitePageShell({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex min-h-screen flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
      <Navbar />
      <main className="relative min-h-[70vh] flex-1">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top,_rgba(6,182,212,0.12),_transparent_60%)]"
          aria-hidden
        />
        <div className="container-max section-pad relative py-8 sm:py-12 md:py-16">
          <header className="mb-8 max-w-2xl sm:mb-10">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
              EarnFlow
            </p>
            <h1 className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl md:text-4xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-3 text-sm text-slate-400 sm:text-base">{subtitle}</p>
            )}
          </header>
          <div className="prose-legal max-w-3xl space-y-6 text-sm text-slate-300 sm:text-base">
            {children}
          </div>
        </div>
      </main>
      <Footer variant="compact" />
      <MobileNav />
    </div>
  );
}
