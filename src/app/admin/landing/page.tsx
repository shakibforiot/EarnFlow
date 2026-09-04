"use client";

import { useEffect, useState } from "react";
import { AdminShell, useAdmin } from "@/components/admin/AdminProvider";
import { Field, adminInput } from "@/components/admin/AdminUI";
import { Button } from "@/components/Button";

export default function AdminLandingPage() {
  const { settings, patchSettings, busy } = useAdmin();
  const [headline, setHeadline] = useState("");
  const [sub, setSub] = useState("");
  const [cta, setCta] = useState("");

  useEffect(() => {
    if (!settings) return;
    setHeadline(settings.landingHeadline);
    setSub(settings.landingSubheadline);
    setCta(settings.landingCta);
  }, [settings]);

  return (
    <AdminShell
      title="Landing"
      subtitle="Customize homepage hero copy with live preview"
    >
      {!settings ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <div className="animate-fade-up grid gap-4 lg:grid-cols-2">
          <div className="space-y-3 rounded-2xl border border-white/10 bg-ink-900/60 p-4">
            <Field label="Headline">
              <input
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className={adminInput}
              />
            </Field>
            <Field label="Subheadline">
              <textarea
                value={sub}
                onChange={(e) => setSub(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-white/10 bg-ink-950/80 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/40"
              />
            </Field>
            <Field label="CTA button">
              <input
                value={cta}
                onChange={(e) => setCta(e.target.value)}
                className={adminInput}
              />
            </Field>
            <Button
              variant="primary"
              disabled={busy}
              onClick={() =>
                void patchSettings({
                  landingHeadline: headline,
                  landingSubheadline: sub,
                  landingCta: cta,
                })
              }
            >
              Publish landing copy
            </Button>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-ink-800 to-ink-950 p-6">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-cyan-300/80">
              Live preview
            </p>
            <h3 className="mt-3 font-display text-4xl font-bold text-white">
              EarnFlow
            </h3>
            <p className="mt-3 text-xl font-medium text-slate-100">{headline}</p>
            <p className="mt-2 text-sm text-slate-400">{sub}</p>
            <button
              type="button"
              className="mt-6 rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-ink-950"
            >
              {cta || "Sign Up Free"}
            </button>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
