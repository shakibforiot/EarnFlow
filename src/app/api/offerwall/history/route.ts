import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { OfferCompletion } from "@/lib/models/OfferCompletion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Partner wall credit + chargeback history for a user. */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId")?.trim() || "";
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    await connectDB();
    const rows = await OfferCompletion.find({
      userId,
      offerId: { $regex: /^wall:/ },
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const credits = rows.filter((r) => !String(r.offerId).startsWith("wall:chargeback:"));
    const chargebacks = rows.filter((r) =>
      String(r.offerId).startsWith("wall:chargeback:"),
    );
    const creditedCoins = credits.reduce((s, r) => s + (r.coins || 0), 0);
    const reversedCoins = chargebacks.reduce(
      (s, r) => s + Math.abs(r.coins || 0),
      0,
    );

    return NextResponse.json({
      credits: credits.map((r) => ({
        id: String(r._id),
        txid: String(r.offerId).replace(/^wall:/, ""),
        coins: r.coins ?? 0,
        at: r.createdAt,
      })),
      chargebacks: chargebacks.map((r) => ({
        id: String(r._id),
        txid: String(r.offerId).replace(/^wall:chargeback:/, ""),
        coins: Math.abs(r.coins || 0),
        at: r.createdAt,
      })),
      summary: {
        creditCount: credits.length,
        chargebackCount: chargebacks.length,
        creditedCoins,
        reversedCoins,
        netCoins: creditedCoins - reversedCoins,
        risk:
          chargebacks.length >= 3 ||
          (creditedCoins > 0 && reversedCoins / creditedCoins >= 0.4)
            ? "high"
            : chargebacks.length >= 1
              ? "medium"
              : "low",
      },
    });
  } catch (err) {
    console.error("offerwall history", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
