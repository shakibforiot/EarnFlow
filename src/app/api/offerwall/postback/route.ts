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
 * Example:
 *   /api/offerwall/postback?uid=USER_ID&coins=250&txid=ABC&secret=YOUR_SECRET&offer=Survey+XYZ
 *
 * Set OFFERWALL_SECRET in .env (or SiteSettings.offerwallSecret).
 */
export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
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

    const secret = q("secret") || q("key") || q("token");
    const settings = await (async () => {
      await connectDB();
      return getSiteSettings();
    })();
    const expected =
      process.env.OFFERWALL_SECRET?.trim() ||
      (settings as { offerwallSecret?: string }).offerwallSecret ||
      "";

    if (!expected || secret !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const uid = q("uid") || q("userId") || q("user");
    const coins = Math.max(0, Math.round(Number(q("coins") || q("amount") || 0)));
    const txid = (q("txid") || q("transaction_id") || q("trans_id") || "").trim();
    const offerName = (q("offer") || q("offer_name") || "Offerwall").trim();

    if (!uid || !mongoose.Types.ObjectId.isValid(uid) || coins < 1) {
      return NextResponse.json({ error: "Invalid params" }, { status: 400 });
    }
    if (!txid) {
      return NextResponse.json({ error: "txid required" }, { status: 400 });
    }

    await connectDB();

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
