import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { Activity } from "@/lib/models/Activity";
import { publishActivity } from "@/lib/activity-store";
import { toPublicUser } from "@/lib/user-public";
import { getSiteSettings } from "@/lib/models/SiteSettings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function faucetConfig() {
  const s = await getSiteSettings();
  const coins = Math.max(1, Number(s.faucetCoins) || 100);
  const cooldownSec = Math.max(60, Number(s.faucetCooldownSec) || 1800);
  return { coins, cooldownMs: cooldownSec * 1000, cooldownSec };
}

async function faucetStatus(userId: string, cooldownMs: number) {
  const last = await Activity.findOne({
    userId,
    source: "Faucet",
    type: "earn",
  })
    .sort({ createdAt: -1 })
    .lean();

  if (!last) {
    return { ready: true, waitSec: 0, lastClaimAt: null as string | null };
  }

  const lastMs = new Date(last.createdAt).getTime();
  const elapsed = Date.now() - lastMs;
  if (elapsed >= cooldownMs) {
    return {
      ready: true,
      waitSec: 0,
      lastClaimAt: new Date(lastMs).toISOString(),
    };
  }

  return {
    ready: false,
    waitSec: Math.ceil((cooldownMs - elapsed) / 1000),
    lastClaimAt: new Date(lastMs).toISOString(),
  };
}

export async function GET(request: Request) {
  try {
    const userId = new URL(request.url).searchParams.get("userId")?.trim();
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }
    await connectDB();
    const cfg = await faucetConfig();
    const status = await faucetStatus(userId, cfg.cooldownMs);
    return NextResponse.json({
      ...status,
      coins: cfg.coins,
      cooldownSec: cfg.cooldownSec,
    });
  } catch (err) {
    console.error("faucet status error", err);
    return NextResponse.json({ error: "Status failed" }, { status: 500 });
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
    const cfg = await faucetConfig();
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.accountStatus === "banned" || user.accountStatus === "restricted") {
      return NextResponse.json(
        {
          error: user.banReason || "This account is banned.",
          code: "ACCOUNT_BANNED",
        },
        { status: 403 },
      );
    }

    const status = await faucetStatus(userId, cfg.cooldownMs);
    if (!status.ready) {
      return NextResponse.json(
        {
          error: `Please wait ${status.waitSec}s before next claim`,
          waitSec: status.waitSec,
        },
        { status: 429 },
      );
    }

    user.balance += cfg.coins;
    user.xp += 1;
    await user.save();

    const masked = `${user.name.slice(0, 4)}••`;
    publishActivity({
      type: "earn",
      user: masked,
      amount: cfg.coins,
      source: "Faucet",
      userId: user._id.toString(),
    });

    await Activity.create({
      type: "earn",
      user: masked,
      amount: String(cfg.coins),
      source: "Faucet",
      userId: user._id,
    });

    return NextResponse.json({
      ok: true,
      coins: cfg.coins,
      waitSec: cfg.cooldownSec,
      user: toPublicUser(user),
    });
  } catch (err) {
    console.error("faucet error", err);
    return NextResponse.json(
      { error: "Faucet claim failed" },
      { status: 500 },
    );
  }
}
