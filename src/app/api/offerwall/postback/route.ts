import { createHash } from "crypto";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { Activity } from "@/lib/models/Activity";
import { OfferCompletion } from "@/lib/models/OfferCompletion";
import { getSiteSettings } from "@/lib/models/SiteSettings";
import { publishActivity } from "@/lib/activity-store";
import { pushNotification } from "@/lib/notify";
import { levelFromXp } from "@/lib/xp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Partner offerwall postback / S2S callback.
 *
 * AdGem-style:
 *   /api/offerwall/postback?uid=...&coins=...&txid=...&secret=OFFERWALL_SECRET&offer=...
 *
 * PubScale-style:
 *   /api/offerwall/postback?user_id=...&value=...&token=...&signature=...
 *   signature = md5(`${PUBSCALE_SECRET}.${user_id}.${Math.trunc(value)}.${token}`)
 */
export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}

function md5(text: string) {
  return createHash("md5").update(text).digest("hex");
}

async function handle(request: Request) {
  try {
    const url = new URL(request.url);
    const body: Record<string, string> = {};
    if (request.method === "POST") {
      try {
        const j = (await request.json()) as Record<string, unknown>;
        for (const [k, v] of Object.entries(j)) {
          body[k] = String(v ?? "");
        }
      } catch {
        /* form */
      }
    }

    const q = (k: string) =>
      url.searchParams.get(k) || body[k] || body[k.toLowerCase()] || "";

    await connectDB();
    const settings = await getSiteSettings();
    const settingsSecret =
      (settings as { offerwallSecret?: string }).offerwallSecret || "";
    const offerwallSecret =
      process.env.OFFERWALL_SECRET?.trim() || settingsSecret;
    const pubscaleSecret =
      process.env.PUBSCALE_SECRET?.trim() || offerwallSecret;

    const uid = (
      q("uid") ||
      q("user_id") ||
      q("userId") ||
      q("user") ||
      q("playerid") ||
      q("player_id") ||
      ""
    ).trim();
    const valueRaw = q("coins") || q("amount") || q("value") || "0";
    const coins = Math.max(0, Math.round(Number(valueRaw)));
    const txid = (
      q("txid") ||
      q("transaction_id") ||
      q("trans_id") ||
      q("token") ||
      ""
    ).trim();
    const offerName = (
      q("offer") ||
      q("offer_name") ||
      q("goal_name") ||
      "Offerwall"
    ).trim();
    const signature = (q("signature") || q("verifier") || "").trim();
    const sharedSecret = (q("secret") || q("key") || "").trim();

    let authorized = false;
    if (signature && pubscaleSecret) {
      // PubScale: md5(secret.user_id.trunc(value).token)
      const template = `${pubscaleSecret}.${uid}.${Math.trunc(Number(valueRaw))}.${txid}`;
      authorized = md5(template) === signature.toLowerCase();
    } else if (offerwallSecret && sharedSecret) {
      // AdGem / generic shared-secret query param
      authorized = sharedSecret === offerwallSecret;
    }

    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!uid || !mongoose.Types.ObjectId.isValid(uid) || coins < 1) {
      return NextResponse.json({ error: "Invalid params" }, { status: 400 });
    }
    if (!txid) {
      return NextResponse.json({ error: "txid required" }, { status: 400 });
    }

    const offerId = `wall:${txid}`;
    try {
      await OfferCompletion.create({
        userId: uid,
        offerId,
      });
    } catch (e: unknown) {
      const code = (e as { code?: number })?.code;
      if (code === 11000) {
        return NextResponse.json({ ok: true, duplicate: true });
      }
      throw e;
    }

    const user = await User.findById(uid);
    if (!user || user.accountStatus === "banned") {
      return NextResponse.json({ error: "User unavailable" }, { status: 404 });
    }

    const xpGain = Math.max(1, Math.floor(coins / 20));
    user.balance += coins;
    user.xp += xpGain;
    user.level = levelFromXp(user.xp);
    await user.save();

    await Activity.create({
      type: "earn",
      user: user.name,
      amount: `+${coins}`,
      source: offerName.slice(0, 80),
      userId: user._id,
    });
    publishActivity({
      type: "earn",
      user: user.name.slice(0, 4) + "••",
      amount: `+${coins}`,
      source: offerName.slice(0, 40),
    });

    await pushNotification({
      userId: uid,
      type: "offer_credit",
      title: "Offer completed",
      body: `+${coins.toLocaleString()} coins from ${offerName}`,
      href: "/dashboard/offers",
      email: true,
    });

    return NextResponse.json({ ok: true, credited: coins });
  } catch (err) {
    console.error("offerwall postback", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
