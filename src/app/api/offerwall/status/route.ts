import { NextResponse } from "next/server";
import { configuredWallProviders } from "@/lib/offerwall";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public-ish status for offerwall env wiring (no secrets leaked). */
export async function GET() {
  const providers = configuredWallProviders();
  const hasOfferwallSecret = Boolean(process.env.OFFERWALL_SECRET?.trim());
  const hasPubscaleSecret = Boolean(
    process.env.PUBSCALE_SECRET?.trim() || process.env.OFFERWALL_SECRET?.trim(),
  );

  return NextResponse.json({
    ok: true,
    postback: {
      credit: "/api/offerwall/postback",
      chargeback: "/api/offerwall/chargeback",
      offerwallSecretSet: hasOfferwallSecret,
      pubscaleSecretSet: hasPubscaleSecret,
    },
    providers: providers.map((p) => ({
      id: p.id,
      name: p.name,
      enabled: p.enabled,
      missing:
        p.id === "adgem"
          ? !p.enabled
            ? ["ADGEM_APP_ID or ADGEM_OFFERWALL_URL"]
            : []
          : !p.enabled
            ? ["PUBSCALE_APP_ID or PUBSCALE_OFFERWALL_URL"]
            : [],
    })),
    tips: [
      "Set OFFERWALL_SECRET (AdGem) and PUBSCALE_SECRET (PubScale) in Vercel.",
      "Callback URL must be /api/offerwall/postback — not the site homepage.",
      "Pass Mongo user id as player_id / unique_id when opening the wall.",
    ],
  });
}
