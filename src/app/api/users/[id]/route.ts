import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { Activity } from "@/lib/models/Activity";
import { levelFromXp } from "@/lib/xp";
import { coinsToUsd } from "@/lib/economy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    await connectDB();
    const user = await User.findById(id).lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isPrivate = user.profilePrivate === true;
    const displayName = `${(user.name || "user").slice(0, 4)}••`;
    const xp = user.xp ?? 0;

    const base = {
      id: user._id.toString(),
      displayName,
      name: user.name,
      country: user.country || "",
      level: user.level ?? levelFromXp(xp),
      streak: user.streak ?? 0,
      xp,
      emailVerified: user.emailVerified === true,
      memberSince: user.createdAt
        ? new Date(user.createdAt).toISOString()
        : null,
      profilePrivate: isPrivate,
      accountStatus: user.accountStatus ?? "active",
    };

    if (isPrivate) {
      return NextResponse.json({
        profile: base,
        private: true,
        summary: null,
        topSources: [],
        offers: [],
        message:
          "This account is private. You can view the profile, but activity history is hidden.",
      });
    }

    const earns = await Activity.find({ userId: user._id, type: "earn" })
      .sort({ createdAt: -1 })
      .lean();

    const parseCoins = (raw: unknown) => {
      const n = Number(String(raw ?? "").replace(/[^\d.-]/g, ""));
      return Number.isFinite(n) ? n : 0;
    };

    const totalEarnedCoins = earns.reduce(
      (sum, item) => sum + parseCoins(item.amount),
      0,
    );
    const offerCount = earns.length;
    const recent = earns.slice(0, 48);

    const sourceMap = new Map<
      string,
      { source: string; coins: number; count: number }
    >();
    for (const item of recent) {
      const source = String(item.source || "Earn");
      const coins = parseCoins(item.amount);
      const prev = sourceMap.get(source);
      if (prev) {
        prev.coins += coins;
        prev.count += 1;
      } else {
        sourceMap.set(source, { source, coins, count: 1 });
      }
    }
    const topSources = [...sourceMap.values()]
      .sort((a, b) => b.coins - a.coins)
      .slice(0, 5);

    return NextResponse.json({
      profile: base,
      private: false,
      summary: {
        totalEarnedCoins,
        totalEarnedUsd: coinsToUsd(totalEarnedCoins),
        offerCount,
        xp,
      },
      topSources,
      offers: recent.map((item) => ({
        id: item._id.toString(),
        source: item.source,
        coins: parseCoins(item.amount),
        createdAt: item.createdAt,
      })),
    });
  } catch (err) {
    console.error("public profile error", err);
    return NextResponse.json(
      { error: "Unable to load profile" },
      { status: 500 },
    );
  }
}
