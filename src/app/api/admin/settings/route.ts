import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import {
  getSiteSettings,
  updateSiteSettings,
  type SiteSettingsDocument,
} from "@/lib/models/SiteSettings";
import { assertAdminAccess } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public-safe slice of settings (no secrets) */
export async function GET() {
  try {
    await connectDB();
    const s = await getSiteSettings();
    return NextResponse.json({
      maintenanceMode: s.maintenanceMode,
      maintenanceMessage: s.maintenanceMessage,
      forceErrorMode: s.forceErrorMode,
      faucetCoins: s.faucetCoins,
      faucetCooldownSec: s.faucetCooldownSec,
      minCashoutUsd: s.minCashoutUsd,
      cashoutEnabled: s.cashoutEnabled,
      streakBaseReward: s.streakBaseReward,
      streakEnabled: s.streakEnabled,
      landingHeadline: s.landingHeadline,
      landingSubheadline: s.landingSubheadline,
      landingCta: s.landingCta,
      leaderboardEnabled: s.leaderboardEnabled !== false,
      leaderboardTitle: s.leaderboardTitle || "Weekly top earners",
      leaderboardLimit: s.leaderboardLimit || 20,
      offerwallSecretSet: Boolean(s.offerwallSecret),
      rankPrizes: s.rankPrizes ?? [],
      offers: s.offers ?? [],
      offerWalls: s.offerWalls ?? [],
      surveys: s.surveys ?? [],
    });
  } catch (err) {
    console.error("settings GET", err);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as Partial<SiteSettingsDocument> & {
      adminSecret?: string;
      adminUserId?: string;
    };
    const gate = await assertAdminAccess(request, body);
    if (!gate.ok) return gate.response;

    await connectDB();
    const allowed: (keyof SiteSettingsDocument)[] = [
      "maintenanceMode",
      "maintenanceMessage",
      "forceErrorMode",
      "faucetCoins",
      "faucetCooldownSec",
      "minCashoutUsd",
      "cashoutEnabled",
      "streakBaseReward",
      "streakEnabled",
      "landingHeadline",
      "landingSubheadline",
      "landingCta",
      "leaderboardEnabled",
      "leaderboardTitle",
      "leaderboardLimit",
      "offerwallSecret",
      "rankPrizes",
      "offers",
      "offerWalls",
      "surveys",
    ];

    const patch: Partial<SiteSettingsDocument> = {};
    for (const key of allowed) {
      if (key in body && body[key] !== undefined) {
        // @ts-expect-error dynamic assign
        patch[key] = body[key];
      }
    }

    const updated = await updateSiteSettings(patch);
    return NextResponse.json({ ok: true, settings: updated });
  } catch (err) {
    console.error("settings PATCH", err);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
