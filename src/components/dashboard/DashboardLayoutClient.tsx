"use client";

import type { ReactNode } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { LiveSupportChat } from "@/components/LiveSupportChat";

export function DashboardLayoutClient({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <DashboardShell>{children}</DashboardShell>
      <LiveSupportChat />
    </RequireAuth>
  );
}
