import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const userId = new URL(request.url).searchParams.get("userId")?.trim();
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    await connectDB();
    const me = await User.findById(userId).select("name").lean();
    if (!me) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const code = `EF${userId.slice(-6).toUpperCase()}`;
    const invited = await User.find({ referredBy: userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .select("name email createdAt balance")
      .lean();

    const bonusEarned = invited.length * 100;

    return NextResponse.json({
      code,
      invitedCount: invited.length,
      bonusEarned,
      invited: invited.map((u) => ({
        id: u._id.toString(),
        name: u.name,
        email: `${String(u.email).slice(0, 2)}••@••`,
        joinedAt: u.createdAt,
        balance: u.balance,
      })),
    });
  } catch (err) {
    console.error("referral GET", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
