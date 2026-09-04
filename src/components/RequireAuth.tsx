"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { clearSession, getSession } from "@/lib/session";

/** Blocks dashboard/app pages unless the user is logged in */
export function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    if (
      session.accountStatus === "banned" ||
      session.accountStatus === "restricted"
    ) {
      clearSession();
      router.replace("/login");
      return;
    }
    setOk(true);
  }, [router]);

  if (!ok) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-ink-950 text-sm text-slate-400">
        <p>Checking session…</p>
        <a href="/login" className="text-cyan-300 hover:underline">
          Go to Sign In
        </a>
      </div>
    );
  }

  return <>{children}</>;
}
