import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { RedeemCode } from "@/lib/models/RedeemCode";
import { User } from "@/lib/models/User";
import { Activity } from "@/lib/models/Activity";
import { publishActivity } from "@/lib/activity-store";
import { toPublicUser } from "@/lib/user-public";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STARTER_CODES = [
  { code: "WELCOME100", coins: 100, maxUses: 0 },
  { code: "EARNFLOW250", coins: 250, maxUses: 500 },
  { code: "BONUS500", coins: 500, maxUses: 100 },
  { code: "MURSA1000", coins: 1000, maxUses: 0 },
];

/** Bump this to wipe starter-code redeem history once (dev reset) */
const REDEEM_RESET_TOKEN = "v3-2026-09-04";

async function ensureStarterCodes() {
  for (const item of STARTER_CODES) {
    await RedeemCode.updateOne(
      { code: item.code },
      {
        $setOnInsert: {
          code: item.code,
          coins: item.coins,
          maxUses: item.maxUses,
          usedCount: 0,
          active: true,
          redeemedBy: [],
        },
      },
      { upsert: true },
    );
  }

  const flagCode = `__RESET_${REDEEM_RESET_TOKEN}__`;
  const flag = await RedeemCode.findOne({ code: flagCode }).lean();
  if (!flag) {
    await RedeemCode.updateMany(
      { code: { $in: STARTER_CODES.map((s) => s.code) } },
      { $set: { redeemedBy: [], usedCount: 0, active: true } },
    );
    await RedeemCode.create({
      code: flagCode,
      coins: 1,
      maxUses: 0,
      usedCount: 0,
      active: false,
      redeemedBy: [],
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      code?: string;
      userId?: string;
    };

    const code = body.code?.trim().toUpperCase();
    const userId = body.userId?.trim();

    if (!code || !userId) {
      return NextResponse.json(
        { error: "Code and user are required" },
        { status: 400 },
      );
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    await connectDB();
    await ensureStarterCodes();

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

    const redeem = await RedeemCode.findOne({ code });
    if (!redeem || !redeem.active) {
      return NextResponse.json(
        { error: "Invalid or inactive redeem code" },
        { status: 404 },
      );
    }

    if (redeem.expiresAt && redeem.expiresAt.getTime() < Date.now()) {
      return NextResponse.json(
        { error: "This redeem code has expired" },
        { status: 410 },
      );
    }

    if (
      redeem.maxUses > 0 &&
      redeem.usedCount >= redeem.maxUses
    ) {
      return NextResponse.json(
        { error: "This redeem code has reached its limit" },
        { status: 410 },
      );
    }

    const already = redeem.redeemedBy.some(
      (id: mongoose.Types.ObjectId) => id.toString() === userId,
    );
    if (already) {
      return NextResponse.json(
        { error: "You already redeemed this code" },
        { status: 409 },
      );
    }

    redeem.redeemedBy.push(user._id);
    redeem.usedCount += 1;
    await redeem.save();

    user.balance += redeem.coins;
    user.xp += Math.floor(redeem.coins / 10);
    await user.save();

    const masked = `${user.name.slice(0, 4)}••`;
    publishActivity({
      type: "earn",
      user: masked,
      amount: redeem.coins,
      source: "Redeem",
      userId: user._id.toString(),
    });

    try {
      await Activity.create({
        type: "earn",
        user: masked,
        amount: String(redeem.coins),
        source: "Redeem",
        userId: user._id,
      });
    } catch {
      /* best-effort */
    }

    return NextResponse.json({
      ok: true,
      coins: redeem.coins,
      user: toPublicUser(user),
    });
  } catch (err) {
    console.error("redeem error", err);
    return NextResponse.json(
      { error: "Redeem failed. Please try again." },
      { status: 500 },
    );
  }
}
