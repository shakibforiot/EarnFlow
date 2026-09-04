"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

type Status = {
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
  forceErrorMode?: boolean;
};

export function SiteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [status, setStatus] = useState<Status | null>(null);
  const isAdmin = pathname?.startsWith("/admin");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/settings", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setStatus(data);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (isAdmin) return <>{children}</>;

  if (status?.forceErrorMode) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-ink-950 px-6 text-center">
        <p className="font-display text-6xl font-bold text-red-400">500</p>
        <h1 className="text-xl font-semibold text-white">
          Internal Server Error
        </h1>
        <p className="max-w-md text-sm text-slate-400">
          Something went wrong on our end. Please try again later.
        </p>
      </div>
    );
  }

  if (status?.maintenanceMode) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-ink-950 px-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
          Maintenance
        </p>
        <h1 className="font-display text-3xl font-bold text-white">
          We&apos;ll be right back
        </h1>
        <p className="max-w-md text-sm text-slate-400">
          {status.maintenanceMessage ||
            "EarnFlow is under maintenance. Please check back soon."}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
