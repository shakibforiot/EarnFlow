import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import {
  getSiteSettings,
  updateSiteSettings,
} from "@/lib/models/SiteSettings";
import { assertAdminAccess } from "@/lib/admin-auth";
import { Activity } from "@/lib/models/Activity";
import { pushNotification } from "@/lib/notify";
import { levelFromXp } from "@/lib/xp";
import { publishActivity } from "@/lib/activity-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Pay out current leaderboard rank prizes (admin trigger). */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      adminSecret?: string;
      adminUserId?: string;
      force?: boolean;
    };
    const gate = await assertAdminAccess(request, body);
    if (!gate.ok) return gate.response;

    await connectDB();
    const settings = await getSiteSettings();
    const prizes = [...(settings.rankPrizes || [])].sort(
      (a, b) => a.place - b.place,
    );
    if (!prizes.length) {
      return NextResponse.json({ error: "No prizes configured" }, { status: 400 });
    }

    const last = (settings as { lastPrizePayoutAt?: Date | string | null })
      .lastPrizePayoutAt;
    if (last && !body.force) {
      const ago = Date.now() - new Date(last).getTime();
      if (ago < 6 * 60 * 60 * 1000) {
        return NextResponse.json(
          {
            error:
              "Prizes already paid recently. Pass force:true to pay again.",
          },
          { status: 429 },
        );
      }
    }

    const limit = Math.max(
      prizes[prizes.length - 1]?.place || 5,
      Number(settings.leaderboardLimit) || 20,
    );

    const users = await User.find({ accountStatus: { $ne: "banned" } })
      .sort({ balance: -1, xp: -1 })
      .limit(limit)
      .select("name balance xp");

    const paid: { place: number; user: string; coins: number }[] = [];

    for (const prize of prizes) {
      const u = users[prize.place - 1];
      if (!u || prize.coins < 1) continue;
      u.balance += prize.coins;
      u.xp += Math.max(1, Math.floor(prize.coins / 50));
      u.level = levelFromXp(u.xp);
      await u.save();

      await Activity.create({
        type: "earn",
        user: u.name,
        amount: `+${prize.coins}`,
        source: `Leaderboard #${prize.place}`,
        userId: u._id,
      });
      publishActivity({
        type: "earn",
        user: u.name.slice(0, 4) + "••",
        amount: `+${prize.coins}`,
        source: `Rank #${prize.place}`,
      });

      await pushNotification({
        userId: u._id.toString(),
        type: "leaderboard_prize",
        title: `Rank #${prize.place} prize!`,
        body: `You won ${prize.coins.toLocaleString()} coins (${prize.label || "leaderboard"}).`,
        href: "/dashboard/leaderboard",
        email: true,
      });

      paid.push({
        place: prize.place,
        user: u.name,
        coins: prize.coins,
      });
    }

    await updateSiteSettings({
      lastPrizePayoutAt: new Date(),
    } as never);

    return NextResponse.json({ ok: true, paid });
  } catch (err) {
    console.error("prize payout", err);
    return NextResponse.json({ error: "Payout failed" }, { status: 500 });
  }
}
