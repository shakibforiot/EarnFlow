import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { Activity } from "@/lib/models/Activity";
import { CashoutRequest } from "@/lib/models/CashoutRequest";
import { publishActivity } from "@/lib/activity-store";
import { toPublicUser } from "@/lib/user-public";
import { isProfileComplete, missingProfileLabels } from "@/lib/profile-complete";
import { getSiteSettings } from "@/lib/models/SiteSettings";
import { usdToCoins } from "@/lib/economy";
import { hasPayoutMethod } from "@/lib/offerwall";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function destinationForMethod(
  methodName: string,
  user: {
    paypalEmail?: string;
    cryptoAddress?: string;
    bkashNumber?: string;
    nagadNumber?: string;
  },
) {
  const name = methodName.toLowerCase();
  if (name.includes("bkash")) return user.bkashNumber || "";
  if (name.includes("nagad")) return user.nagadNumber || "";
  if (name.includes("paypal")) return user.paypalEmail || "";
  if (
    name.includes("bitcoin") ||
    name.includes("ethereum") ||
    name.includes("litecoin") ||
    name.includes("crypto")
  ) {
    return user.cryptoAddress || "";
  }
  return (
    user.paypalEmail ||
    user.bkashNumber ||
    user.nagadNumber ||
    user.cryptoAddress ||
    ""
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      userId?: string;
      method?: string;
      methodName?: string;
      amountUsd?: number;
    };

    const userId = body.userId?.trim();
    const method = body.method?.trim();
    const methodName = body.methodName?.trim() || method;
    const amountUsd = Number(body.amountUsd);

    if (!userId || !method || Number.isNaN(amountUsd) || amountUsd <= 0) {
      return NextResponse.json(
        { error: "User, method, and amount are required" },
        { status: 400 },
      );
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    await connectDB();
    const settings = await getSiteSettings();
    if (settings.cashoutEnabled === false) {
      return NextResponse.json(
        { error: "Cash out is temporarily disabled by admin." },
        { status: 403 },
      );
    }

    const minUsd = Math.max(1, Number(settings.minCashoutUsd) || 5);
    const coins = usdToCoins(amountUsd);
    if (amountUsd < minUsd) {
      return NextResponse.json(
        { error: `Minimum cash out is $${minUsd.toFixed(2)}` },
        { status: 400 },
      );
    }
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

    if (!isProfileComplete(user)) {
      const missing = missingProfileLabels(user);
      return NextResponse.json(
        {
          error: `Complete your profile before cash out: ${missing.join(", ")}`,
          missing,
          code: "PROFILE_INCOMPLETE",
        },
        { status: 403 },
      );
    }

    if (!hasPayoutMethod(user)) {
      return NextResponse.json(
        { error: "Add a payout method in Profile first." },
        { status: 400 },
      );
    }

    const lower = (methodName || method).toLowerCase();
    if (lower.includes("bkash") && !user.bkashNumber?.trim()) {
      return NextResponse.json(
        { error: "Add your bKash number in Profile → Payouts." },
        { status: 400 },
      );
    }
    if (lower.includes("nagad") && !user.nagadNumber?.trim()) {
      return NextResponse.json(
        { error: "Add your Nagad number in Profile → Payouts." },
        { status: 400 },
      );
    }
    if (lower.includes("paypal") && !user.paypalEmail?.trim()) {
      return NextResponse.json(
        { error: "Add your PayPal email in Profile → Payouts." },
        { status: 400 },
      );
    }

    if (user.balance < coins) {
      return NextResponse.json(
        { error: "Insufficient balance" },
        { status: 400 },
      );
    }

    const destination = destinationForMethod(methodName || method, user);

    user.balance -= coins;
    await user.save();

    const cashout = await CashoutRequest.create({
      userId: user._id,
      method,
      methodName,
      destination: destination || null,
      amountUsd,
      coins,
      status: "pending",
    });

    const masked = `${user.name.slice(0, 4)}••`;
    publishActivity({
      type: "cashout",
      user: masked,
      amount: coins,
      source: "Cash Out",
      userId: user._id.toString(),
    });

    try {
      await Activity.create({
        type: "cashout",
        user: masked,
        amount: String(coins),
        source: "Cash Out",
        userId: user._id,
      });
    } catch {
      /* best-effort */
    }

    return NextResponse.json({
      ok: true,
      cashout: {
        id: cashout._id.toString(),
        method: cashout.methodName,
        destination: cashout.destination,
        amountUsd: cashout.amountUsd,
        coins: cashout.coins,
        status: cashout.status,
        createdAt: cashout.createdAt,
      },
      user: toPublicUser(user),
    });
  } catch (err) {
    console.error("cashout error", err);
    return NextResponse.json(
      { error: "Cash out failed. Please try again." },
      { status: 500 },
    );
  }
}
