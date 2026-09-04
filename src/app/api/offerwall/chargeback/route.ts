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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PubScale chargeback / reversal S2S.
 *   /api/offerwall/chargeback?user_id=...&value=...&token=...&signature=...
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
    const signature = (q("signature") || "").trim();
    const sharedSecret = (q("secret") || q("key") || "").trim();

    let authorized = false;
    if (signature && pubscaleSecret) {
      const template = `${pubscaleSecret}.${uid}.${Math.trunc(Number(valueRaw))}.${txid}`;
      authorized = md5(template) === signature.toLowerCase();
    } else if (offerwallSecret && sharedSecret) {
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

    const reverseId = `wall:chargeback:${txid}`;
    try {
      await OfferCompletion.create({
        userId: uid,
        offerId: reverseId,
        coins: -coins,
      });
    } catch (e: unknown) {
      const code = (e as { code?: number })?.code;
      if (code === 11000) {
        return NextResponse.json({ ok: true, duplicate: true });
      }
      throw e;
    }

    const user = await User.findById(uid);
    if (!user) {
      return NextResponse.json({ error: "User unavailable" }, { status: 404 });
    }

    const deducted = Math.min(user.balance, coins);
    user.balance = Math.max(0, user.balance - coins);
    await user.save();

    await Activity.create({
      type: "cashout",
      user: user.name,
      amount: `-${deducted}`,
      source: "Offer chargeback",
      userId: user._id,
    });
    publishActivity({
      type: "cashout",
      user: user.name.slice(0, 4) + "••",
      amount: `-${deducted}`,
      source: "Chargeback",
    });

    await pushNotification({
      userId: uid,
      type: "system",
      title: "Reward reversed",
      body: `${deducted.toLocaleString()} coins removed (offer chargeback).`,
      href: "/dashboard/offers",
      email: true,
    });

    return NextResponse.json({ ok: true, deducted });
  } catch (err) {
    console.error("offerwall chargeback", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
