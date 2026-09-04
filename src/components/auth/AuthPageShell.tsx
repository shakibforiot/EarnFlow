import type { ReactNode } from "react";
import { Footer } from "@/components/Footer";

export function AuthPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="relative flex flex-1 items-center justify-center px-4 py-12">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute top-20 left-1/4 h-64 w-64 rounded-full bg-cyan-500/15 blur-3xl animate-float" />
          <div className="absolute bottom-20 right-1/4 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl animate-float-delayed" />
        </div>
        <div className="relative w-full max-w-md animate-fade-up rounded-3xl border border-white/12 bg-ink-900/90 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-8">
          {children}
        </div>
      </div>
      <Footer variant="compact" />
    </div>
  );
}
