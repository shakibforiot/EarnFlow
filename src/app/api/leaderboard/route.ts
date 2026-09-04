import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { getSiteSettings } from "@/lib/models/SiteSettings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function maskName(name: string) {
  const clean = name.trim() || "user";
  return `${clean.slice(0, 4)}••`;
}

function prizeForPlace(
  place: number,
  prizes: { place: number; coins: number; label: string }[],
) {
  const hit = prizes.find((p) => Number(p.place) === place);
  if (!hit) return { prize: "—", prizeCoins: 0, prizeLabel: "" };
  const coins = Math.max(0, Number(hit.coins) || 0);
  const label = hit.label?.trim() || `${place}${ordinal(place)} place`;
  return {
    prize: coins > 0 ? `${coins.toLocaleString()} coins` : label,
    prizeCoins: coins,
    prizeLabel: label,
  };
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

export async function GET() {
  try {
    await connectDB();
    const settings = await getSiteSettings();
    const enabled = settings.leaderboardEnabled !== false;
    const prizes = [...(settings.rankPrizes || [])].sort(
      (a, b) => a.place - b.place,
    );
    const limit = Math.min(
      50,
      Math.max(5, Number(settings.leaderboardLimit) || 20),
    );

    if (!enabled) {
      return NextResponse.json({
        enabled: false,
        title: settings.leaderboardTitle || "Leaderboard",
        prizes,
        rows: [],
      });
    }

    const users = await User.find({
      accountStatus: { $ne: "banned" },
    })
      .sort({ balance: -1, xp: -1 })
      .limit(limit)
      .select("name balance xp")
      .lean();

    const rows = users.map((u, i) => {
      const place = i + 1;
      const p = prizeForPlace(place, prizes);
      return {
        rank: place,
        user: maskName(u.name),
        coins: u.balance ?? 0,
        xp: u.xp ?? 0,
        prize: p.prize,
        prizeCoins: p.prizeCoins,
        prizeLabel: p.prizeLabel,
      };
    });

    return NextResponse.json({
      enabled: true,
      title: settings.leaderboardTitle || "Weekly top earners",
      limit,
      prizes,
      rows,
    });
  } catch (err) {
    console.error("leaderboard error", err);
    return NextResponse.json({
      enabled: true,
      title: "Leaderboard",
      prizes: [],
      rows: [],
    });
  }
}
