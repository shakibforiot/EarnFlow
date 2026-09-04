"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell, useAdmin } from "@/components/admin/AdminProvider";
import { Badge, adminInput } from "@/components/admin/AdminUI";
import { Button } from "@/components/Button";
import { ago } from "@/lib/admin-types";

type Msg = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
};

export default function AdminContactPage() {
  const { api, busy } = useAdmin();
  const [rows, setRows] = useState<Msg[]>([]);
  const [unread, setUnread] = useState(0);
  const [filter, setFilter] = useState("all");
  const [active, setActive] = useState<Msg | null>(null);

  const load = useCallback(async () => {
    const res = await api<{ messages?: Msg[]; unread?: number }>(
      `/api/admin/contact?status=${filter}`,
    );
    if (res.ok) {
      setRows(res.data.messages || []);
      setUnread(res.data.unread || 0);
    }
  }, [api, filter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function setStatus(id: string, status: "new" | "read" | "replied") {
    await api("/api/admin/contact", {
      method: "PATCH",
      json: { id, status },
    });
    void load();
    if (active?.id === id) setActive({ ...active, status });
  }

  return (
    <AdminShell
      title="Contact inbox"
      subtitle="Messages from /contact form"
      actions={<Badge tone={unread ? "warn" : "ok"}>{unread} new</Badge>}
    >
      <div className="animate-fade-up grid gap-4 md:grid-cols-[240px_1fr] lg:grid-cols-[300px_1fr]">
        <aside className="rounded-2xl border border-white/10 bg-ink-900/60 p-3">
          <div className="mb-2 flex flex-wrap gap-1">
            {(["all", "new", "read", "replied"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-lg px-2 py-1 text-[11px] font-medium capitalize ${
                  filter === f
                    ? "bg-cyan-400 text-ink-950"
                    : "text-slate-400 hover:bg-white/5"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <ul className="max-h-[40vh] space-y-1 overflow-y-auto md:max-h-[60vh]">
            {!rows.length && (
              <li className="py-8 text-center text-sm text-slate-500">
                No messages
              </li>
            )}
            {rows.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => {
                    setActive(m);
                    if (m.status === "new") void setStatus(m.id, "read");
                  }}
                  className={`w-full rounded-xl px-3 py-2.5 text-left ${
                    active?.id === m.id
                      ? "bg-cyan-500/15 ring-1 ring-cyan-400/30"
                      : "hover:bg-white/5"
                  }`}
                >
                  <p className="truncate text-sm font-medium text-white">
                    {m.subject}
                  </p>
                  <p className="truncate text-[11px] text-slate-500">
                    {m.name} · {ago(m.createdAt)}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="rounded-2xl border border-white/10 bg-ink-900/60 p-4">
          {!active ? (
            <p className="py-16 text-center text-sm text-slate-500">
              Select a message
            </p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-lg font-semibold text-white">
                  {active.subject}
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  {active.name} ·{" "}
                  <a
                    href={`mailto:${active.email}`}
                    className="text-cyan-300 hover:underline"
                  >
                    {active.email}
                  </a>
                </p>
                <Badge tone="neutral">{active.status}</Badge>
              </div>
              <p className="whitespace-pre-wrap rounded-xl border border-white/8 bg-ink-950/50 p-4 text-sm text-slate-200">
                {active.message}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => void setStatus(active.id, "replied")}
                >
                  Mark replied
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  href={`mailto:${active.email}?subject=Re: ${encodeURIComponent(active.subject)}`}
                >
                  Reply by email
                </Button>
              </div>
              <input
                readOnly
                value={active.email}
                className={adminInput}
                aria-label="Email"
              />
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
