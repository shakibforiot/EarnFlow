"use client";

import { useEffect, useState, type ReactNode } from "react";
import { clearSession, getSession } from "@/lib/session";

export function RedirectIfLoggedIn({
  children,
  to = "/dashboard",
}: {
  children: ReactNode;
  to?: string;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (
      session &&
      (session.accountStatus === "banned" ||
        session.accountStatus === "restricted")
    ) {
      clearSession();
      setReady(true);
      return;
    }
    if (session) {
      window.location.replace(to);
      return;
    }
    setReady(true);
  }, [to]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950 text-sm text-slate-400">
        Redirecting…
      </div>
    );
  }

  return <>{children}</>;
}
