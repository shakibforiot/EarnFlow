import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { Activity } from "@/lib/models/Activity";
import { OfferCompletion } from "@/lib/models/OfferCompletion";
import { publishActivity } from "@/lib/activity-store";
import { toPublicUser } from "@/lib/user-public";
import { getOfferById, type OfferItem } from "@/data/dashboard";
import { isAccountBlocked } from "@/lib/ip-account-limit";
import { getSiteSettings } from "@/lib/models/SiteSettings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function levelFromXp(xp: number) {
  return Math.max(1, Math.floor(xp / 100) + 1);
}

async function resolveOffer(offerId: string): Promise<OfferItem | null> {
  const settings = await getSiteSettings();
  const fromSettings =
    (settings.offers || []).find((o) => o.id === offerId) ||
    (settings.surveys || []).find((o) => o.id === offerId);
  if (fromSettings) {
    return {
      id: fromSettings.id,
      title: fromSettings.title,
      provider: fromSettings.provider || "Admin",
      reward: Number(fromSettings.reward ?? fromSettings.coins ?? 0),
      coins: Number(fromSettings.coins ?? fromSettings.reward ?? 0),
      category: ((
        "category" in fromSettings
          ? (fromSettings as { category?: OfferItem["category"] }).category
          : undefined
      ) || "offer") as OfferItem["category"],
      time:
        ("time" in fromSettings
          ? (fromSettings as { time?: string }).time
          : undefined) || "10 min",
      difficulty: ((
        "difficulty" in fromSettings
          ? (fromSettings as { difficulty?: OfferItem["difficulty"] })
              .difficulty
          : undefined
      ) || "Easy") as OfferItem["difficulty"],
      featured:
        "featured" in fromSettings
          ? Boolean((fromSettings as { featured?: boolean }).featured)
          : false,
      image: fromSettings.image || "",
    };
  }
  return getOfferById(offerId);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      userId?: string;
      offerId?: string;
    };

    const userId = body.userId?.trim();
    const offerId = body.offerId?.trim();

    if (!userId || !offerId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { error: "User and offer are required" },
        { status: 400 },
      );
    }

    await connectDB();
    const offer = await resolveOffer(offerId);
    if (!offer) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (isAccountBlocked(user)) {
      return NextResponse.json(
        { error: user.banReason || "This account is banned.", code: "ACCOUNT_BANNED" },
        { status: 403 },
      );
    }

    try {
      await OfferCompletion.create({
        userId: user._id,
        offerId: offer.id,
        coins: offer.coins,
      });
    } catch (err: unknown) {
      const code =
        err && typeof err === "object" && "code" in err
          ? (err as { code?: number }).code
          : undefined;
      if (code === 11000) {
        return NextResponse.json(
          { error: "You already completed this offer.", code: "ALREADY_DONE" },
          { status: 409 },
        );
      }
      throw err;
    }

    user.balance += offer.coins;
    user.xp += Math.max(1, Math.round(offer.coins / 50));
    user.level = levelFromXp(user.xp);
    await user.save();

    const masked = `${user.name.slice(0, 4)}••`;
    publishActivity({
      type: "earn",
      user: masked,
      amount: offer.coins,
      source: offer.provider,
      userId: user._id.toString(),
    });

    await Activity.create({
      type: "earn",
      user: masked,
      amount: String(offer.coins),
      source: offer.provider,
      userId: user._id,
    });

    return NextResponse.json({
      ok: true,
      coins: offer.coins,
      offer,
      user: toPublicUser(user),
    });
  } catch (err) {
    console.error("offer complete error", err);
    return NextResponse.json(
      { error: "Could not complete offer" },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId")?.trim();
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    await connectDB();
    const rows = await OfferCompletion.find({ userId })
      .select("offerId")
      .lean();
    return NextResponse.json({
      completed: rows.map((r) => r.offerId),
    });
  } catch (err) {
    console.error("offer list error", err);
    return NextResponse.json(
      { error: "Could not load completions" },
      { status: 500 },
    );
  }
}
