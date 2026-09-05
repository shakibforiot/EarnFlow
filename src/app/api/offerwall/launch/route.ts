import { NextResponse } from "next/server";
import mongoose from "mongoose";
import {
  buildWallLaunchUrl,
  configuredWallProviders,
} from "@/lib/offerwall";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** List partner walls + optional launch URL for a user. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId")?.trim() || "";
  const providers = configuredWallProviders().map((p) => ({
    ...p,
    launchUrl:
      p.enabled && userId && mongoose.Types.ObjectId.isValid(userId)
        ? buildWallLaunchUrl(p.id, userId)
        : null,
  }));

  return NextResponse.json({
    providers,
    rateNote: "1000 coins = $1 · Rewards credit via secure S2S postback",
  });
}

/** POST { userId, provider } → { url } */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      userId?: string;
      provider?: string;
    };
    const userId = body.userId?.trim() || "";
    const provider = body.provider?.trim() as "adgem" | "pubscale" | undefined;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }
    if (provider !== "adgem" && provider !== "pubscale") {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    const url = buildWallLaunchUrl(provider, userId);
    if (!url) {
      return NextResponse.json(
        {
          error: `${provider} is not configured. Set env ADGEM_* or PUBSCALE_* launch vars.`,
          code: "NOT_CONFIGURED",
        },
        { status: 503 },
      );
    }

    return NextResponse.json({ ok: true, url, provider, userId });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
