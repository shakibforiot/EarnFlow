import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { Activity } from "@/lib/models/Activity";
import { publishActivity } from "@/lib/activity-store";
import { toPublicUser } from "@/lib/user-public";
import { streakDays } from "@/data/site";
import { isAccountBlocked } from "@/lib/ip-account-limit";
import { utcDayKey } from "@/lib/models/TaskClaim";
import { getSiteSettings } from "@/lib/models/SiteSettings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function rewardForDay(day: number, baseReward = 10) {
  const entry = streakDays.find((d) => d.day === ((day - 1) % 7) + 1);
  const staticReward = Number(entry?.reward ?? 10);
  // Scale day table relative to default day-1 = 10 using admin base
  return Math.max(1, Math.round((staticReward / 10) * baseReward));
}

function sameUtcDay(a: Date, b: Date) {
  return utcDayKey(a) === utcDayKey(b);
}

function yesterdayKey(d = new Date()) {
  const y = new Date(d);
  y.setUTCDate(y.getUTCDate() - 1);
  return utcDayKey(y);
}

export async function GET(request: Request) {
  try {
    const userId = new URL(request.url).searchParams.get("userId")?.trim();
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }
    await connectDB();
    const settings = await getSiteSettings();
    const base = Math.max(1, Number(settings.streakBaseReward) || 10);
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const claimedToday = user.lastStreakAt
      ? sameUtcDay(new Date(user.lastStreakAt), new Date())
      : false;

    const days = streakDays.map((d) => ({
      ...d,
      reward: String(rewardForDay(d.day, base)),
    }));

    return NextResponse.json({
      streak: user.streak ?? 0,
      claimedToday,
      enabled: settings.streakEnabled !== false,
      nextReward: rewardForDay(
        (user.streak ?? 0) + (claimedToday ? 0 : 1),
        base,
      ),
      days,
    });
  } catch (err) {
    console.error("streak get error", err);
    return NextResponse.json({ error: "Could not load streak" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { userId?: string };
    const userId = body.userId?.trim();
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    await connectDB();
    const settings = await getSiteSettings();
    if (settings.streakEnabled === false) {
      return NextResponse.json(
        { error: "Streak rewards are disabled." },
        { status: 403 },
      );
    }
    const base = Math.max(1, Number(settings.streakBaseReward) || 10);
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

    const now = new Date();
    if (user.lastStreakAt && sameUtcDay(new Date(user.lastStreakAt), now)) {
      return NextResponse.json(
        { error: "Streak already claimed today.", claimedToday: true },
        { status: 429 },
      );
    }

    const last = user.lastStreakAt ? new Date(user.lastStreakAt) : null;
    if (last && utcDayKey(last) === yesterdayKey(now)) {
      user.streak = (user.streak ?? 0) + 1;
    } else {
      user.streak = 1;
    }

    const coins = rewardForDay(user.streak, base);
    user.balance += coins;
    user.xp += 2;
    user.lastStreakAt = now;
    await user.save();

    const masked = `${user.name.slice(0, 4)}••`;
    publishActivity({
      type: "earn",
      user: masked,
      amount: coins,
      source: "Streak",
      userId: user._id.toString(),
    });
    await Activity.create({
      type: "earn",
      user: masked,
      amount: String(coins),
      source: "Streak",
      userId: user._id,
    });

    return NextResponse.json({
      ok: true,
      coins,
      streak: user.streak,
      user: toPublicUser(user),
    });
  } catch (err) {
    console.error("streak claim error", err);
    return NextResponse.json({ error: "Streak claim failed" }, { status: 500 });
  }
}
