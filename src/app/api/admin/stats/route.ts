import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { CashoutRequest } from "@/lib/models/CashoutRequest";
import { RedeemCode } from "@/lib/models/RedeemCode";
import { Activity } from "@/lib/models/Activity";
import { getSiteSettings } from "@/lib/models/SiteSettings";
import { assertAdminAccess } from "@/lib/admin-auth";
import { SupportChat } from "@/lib/models/SupportChat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const gate = await assertAdminAccess(request);
    if (!gate.ok) return gate.response;

    await connectDB();
    const settings = await getSiteSettings();

    const [
      totalUsers,
      activeUsers,
      bannedUsers,
      frozenUsers,
      unverifiedEmail,
      kycPending,
      pendingCashouts,
      approvedCashouts,
      redeemActive,
      coinAgg,
      cashPendingAgg,
      recentActivity,
      supportWaiting,
      supportOpen,
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ accountStatus: "active" }),
      User.countDocuments({ accountStatus: "banned" }),
      User.countDocuments({ accountStatus: "restricted" }),
      User.countDocuments({ emailVerified: { $ne: true } }),
      User.countDocuments({ kycStatus: "pending" }),
      CashoutRequest.countDocuments({ status: "pending" }),
      CashoutRequest.countDocuments({ status: "approved" }),
      RedeemCode.countDocuments({
        active: true,
        code: { $not: /^__RESET_/ },
      }),
      User.aggregate([
        { $group: { _id: null, total: { $sum: "$balance" }, xp: { $sum: "$xp" } } },
      ]),
      CashoutRequest.aggregate([
        { $match: { status: "pending" } },
        {
          $group: {
            _id: null,
            usd: { $sum: "$amountUsd" },
            coins: { $sum: "$coins" },
          },
        },
      ]),
      Activity.find({})
        .sort({ createdAt: -1 })
        .limit(12)
        .lean(),
      SupportChat.countDocuments({
        status: { $in: ["waiting_admin", "admin_active"] },
      }),
      SupportChat.countDocuments({ status: "open" }),
    ]);

    return NextResponse.json({
      users: {
        total: totalUsers,
        active: activeUsers,
        banned: bannedUsers,
        frozen: frozenUsers,
        unverifiedEmail,
        kycPending,
      },
      cashouts: {
        pending: pendingCashouts,
        approved: approvedCashouts,
        pendingUsd: cashPendingAgg[0]?.usd ?? 0,
        pendingCoins: cashPendingAgg[0]?.coins ?? 0,
      },
      economy: {
        circulatingCoins: coinAgg[0]?.total ?? 0,
        totalXp: coinAgg[0]?.xp ?? 0,
        redeemActive,
        faucetCoins: settings.faucetCoins,
        faucetCooldownSec: settings.faucetCooldownSec,
        minCashoutUsd: settings.minCashoutUsd,
      },
      site: {
        maintenanceMode: settings.maintenanceMode,
        forceErrorMode: settings.forceErrorMode,
        cashoutEnabled: settings.cashoutEnabled,
        streakEnabled: settings.streakEnabled,
        offers: (settings.offers || []).length,
        walls: (settings.offerWalls || []).length,
      },
      support: {
        waiting: supportWaiting,
        open: supportOpen,
      },
      recent: recentActivity.map((a) => ({
        id: a._id.toString(),
        type: a.type,
        user: a.user,
        amount: a.amount,
        source: a.source,
        createdAt: a.createdAt,
      })),
    });
  } catch (err) {
    console.error("admin stats", err);
    return NextResponse.json({ error: "Stats failed" }, { status: 500 });
  }
}
