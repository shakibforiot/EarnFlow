import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { Activity } from "@/lib/models/Activity";
import { CashoutRequest } from "@/lib/models/CashoutRequest";
import { toPublicUser } from "@/lib/user-public";
import { countryFromIso, normalizeCountryName } from "@/lib/countries";
import {
  clearUnlockAfterEdit,
  isFieldLocked,
} from "@/lib/profile-locks";
import { getSiteSettings } from "@/lib/models/SiteSettings";
import { coinsToUsd } from "@/lib/economy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function detectCountry(request: Request) {
  const headers = request.headers;
  const headerCountry =
    headers.get("x-vercel-ip-country") ||
    headers.get("cf-ipcountry") ||
    headers.get("x-country-code") ||
    "";

  let country = countryFromIso(headerCountry);
  let timezone = "";

  if (!country) {
    try {
      const res = await fetch("https://ipapi.co/json/", {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as {
          country_code?: string;
          country_name?: string;
          timezone?: string;
        };
        country =
          countryFromIso(data.country_code) ||
          normalizeCountryName(data.country_name);
        timezone = data.timezone || "";
      }
    } catch {
      /* ignore */
    }
  }

  return { country, timezone };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId")?.trim();

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    await connectDB();

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Auto-select country only when not locked yet
    if (!isFieldLocked(user, "country") && (!user.country || user.countryAuto !== false)) {
      const geo = await detectCountry(request);
      let changed = false;
      if (geo.country && (!user.country || user.countryAuto !== false)) {
        if (!user.country || user.countryAuto) {
          user.country = geo.country;
          user.countryAuto = true;
          changed = true;
        }
      }
      if (geo.timezone && !user.timezone) {
        user.timezone = geo.timezone;
        changed = true;
      }
      if (changed) await user.save();
    }

    const [earns, cashouts, earnStats] = await Promise.all([
      Activity.find({ userId: user._id, type: "earn" })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      CashoutRequest.find({ userId: user._id })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      Activity.find({ userId: user._id, type: "earn" })
        .select("amount")
        .lean(),
    ]);

    const parseCoins = (raw: unknown) => {
      const n = Number(String(raw ?? "").replace(/[^\d.-]/g, ""));
      return Number.isFinite(n) ? n : 0;
    };

    const totalEarnedCoins = earnStats.reduce(
      (sum, item) => sum + parseCoins(item.amount),
      0,
    );
    const offerCountTotal = earnStats.length;

    const pendingCoins = cashouts
      .filter((c) => c.status === "pending")
      .reduce((sum, c) => sum + c.coins, 0);
    const approvedCoins = cashouts
      .filter((c) => c.status === "approved")
      .reduce((sum, c) => sum + c.coins, 0);

    const publicUser = toPublicUser(user);
    const profileScore = [
      publicUser.emailVerified,
      Boolean(publicUser.country),
      Boolean(publicUser.paypalEmail || publicUser.cryptoAddress),
      Boolean(publicUser.phone),
      publicUser.kycStatus === "verified" || publicUser.kycStatus === "pending",
    ].filter(Boolean).length;

    const settings = await getSiteSettings();
    const minCashoutUsd = Math.max(1, Number(settings.minCashoutUsd) || 5);

    return NextResponse.json({
      user: publicUser,
      summary: {
        totalEarnedCoins,
        totalEarnedUsd: coinsToUsd(totalEarnedCoins),
        pendingCoins,
        pendingUsd: coinsToUsd(pendingCoins),
        approvedCoins,
        approvedUsd: coinsToUsd(approvedCoins),
        offerCount: offerCountTotal,
        cashoutCount: cashouts.length,
        profileScore,
        profileScoreMax: 5,
        minCashoutUsd,
        cashoutProgress: Math.min(
          100,
          (coinsToUsd(publicUser.balance) / minCashoutUsd) * 100,
        ),
      },
      offers: earns.map((item) => ({
        id: item._id.toString(),
        source: item.source,
        coins: parseCoins(item.amount),
        createdAt: item.createdAt,
      })),
      cashouts: cashouts.map((item) => ({
        id: item._id.toString(),
        method: item.methodName,
        coins: item.coins,
        amountUsd: item.amountUsd,
        status: item.status,
        giftCode: (item as { giftCode?: string | null }).giftCode || null,
        createdAt: item.createdAt,
      })),
    });
  } catch (err) {
    console.error("profile error", err);
    return NextResponse.json(
      { error: "Unable to load profile" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      userId?: string;
      name?: string;
      country?: string;
      countryAuto?: boolean;
      timezone?: string;
      language?: string;
      phone?: string;
      paypalEmail?: string;
      cryptoAddress?: string;
      preferredCashout?: string;
      twoFactorEnabled?: boolean;
      kycStatus?: "none" | "pending" | "verified" | "rejected";
      notifyOffers?: boolean;
      notifyCashout?: boolean;
      notifyNewsletter?: boolean;
      profilePrivate?: boolean;
    };

    const userId = body.userId?.trim();
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    await connectDB();
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (typeof body.name === "string" && body.name.trim()) {
      user.name = body.name.trim().slice(0, 40);
    }

    if (typeof body.country === "string") {
      const nextCountry = body.country.trim().slice(0, 60);
      if (isFieldLocked(user, "country") && nextCountry !== (user.country ?? "")) {
        return NextResponse.json(
          {
            error:
              "Country is locked. Contact admin to unlock before changing.",
            code: "FIELD_LOCKED",
            field: "country",
          },
          { status: 403 },
        );
      }
      if (nextCountry !== (user.country ?? "")) {
        user.country = nextCountry;
        if (user.adminUnlocks?.country) {
          user.adminUnlocks = clearUnlockAfterEdit(user.adminUnlocks, "country");
          user.markModified("adminUnlocks");
        }
      }
    }
    if (typeof body.countryAuto === "boolean") {
      if (isFieldLocked(user, "country") && body.countryAuto !== user.countryAuto) {
        return NextResponse.json(
          {
            error: "Country settings are locked.",
            code: "FIELD_LOCKED",
            field: "country",
          },
          { status: 403 },
        );
      }
      user.countryAuto = body.countryAuto;
    }
    if (typeof body.timezone === "string") {
      user.timezone = body.timezone.trim().slice(0, 80);
    }
    if (typeof body.language === "string") {
      user.language = body.language.trim().slice(0, 10);
    }
    if (typeof body.phone === "string") {
      const nextPhone = body.phone.trim().slice(0, 30);
      if (isFieldLocked(user, "phone") && nextPhone !== (user.phone ?? "")) {
        return NextResponse.json(
          {
            error:
              "Phone is locked. Contact admin to unlock before changing.",
            code: "FIELD_LOCKED",
            field: "phone",
          },
          { status: 403 },
        );
      }
      if (nextPhone !== (user.phone ?? "")) {
        user.phone = nextPhone;
        if (user.adminUnlocks?.phone) {
          user.adminUnlocks = clearUnlockAfterEdit(user.adminUnlocks, "phone");
          user.markModified("adminUnlocks");
        }
      }
    }
    if (typeof body.paypalEmail === "string" || typeof body.cryptoAddress === "string") {
      const nextPaypal =
        typeof body.paypalEmail === "string"
          ? body.paypalEmail.trim().toLowerCase().slice(0, 120)
          : user.paypalEmail;
      const nextCrypto =
        typeof body.cryptoAddress === "string"
          ? body.cryptoAddress.trim().slice(0, 120)
          : user.cryptoAddress;

      const payoutChanged =
        nextPaypal !== (user.paypalEmail ?? "") ||
        nextCrypto !== (user.cryptoAddress ?? "");

      if (isFieldLocked(user, "payout") && payoutChanged) {
        return NextResponse.json(
          {
            error:
              "Payout methods are locked. Contact admin to unlock before changing.",
            code: "FIELD_LOCKED",
            field: "payout",
          },
          { status: 403 },
        );
      }

      if (typeof body.paypalEmail === "string") user.paypalEmail = nextPaypal;
      if (typeof body.cryptoAddress === "string") user.cryptoAddress = nextCrypto;
      if (payoutChanged && user.adminUnlocks?.payout) {
        user.adminUnlocks = clearUnlockAfterEdit(user.adminUnlocks, "payout");
        user.markModified("adminUnlocks");
      }
    }
    if (typeof body.preferredCashout === "string") {
      user.preferredCashout = body.preferredCashout.trim().slice(0, 40);
    }
    if (typeof body.twoFactorEnabled === "boolean") {
      user.twoFactorEnabled = body.twoFactorEnabled;
    }
    // KYC status: users cannot self-set pending; admin can reject/reset via unlock API
    if (
      body.kycStatus === "none" ||
      body.kycStatus === "verified" ||
      body.kycStatus === "rejected"
    ) {
      // ignore client-driven KYC status changes for security
    }
    if (typeof body.notifyOffers === "boolean") {
      user.notifyOffers = body.notifyOffers;
    }
    if (typeof body.notifyCashout === "boolean") {
      user.notifyCashout = body.notifyCashout;
    }
    if (typeof body.notifyNewsletter === "boolean") {
      user.notifyNewsletter = body.notifyNewsletter;
    }
    if (typeof body.profilePrivate === "boolean") {
      user.profilePrivate = body.profilePrivate;
    }

    // Normalize bad timezone values (e.g. ipwho object accidentally saved)
    if (user.timezone && typeof user.timezone !== "string") {
      const tz = user.timezone as { id?: string };
      user.timezone =
        tz && typeof tz === "object" && typeof tz.id === "string" ? tz.id : "";
    } else if (user.timezone === "[object Object]") {
      user.timezone = "";
    }

    await user.save();

    // Re-read lean so boolean flags (profilePrivate, etc.) always match DB
    const fresh = await User.findById(userId).lean();
    return NextResponse.json({
      ok: true,
      user: toPublicUser((fresh ?? user) as typeof user),
    });
  } catch (err) {
    console.error("profile patch error", err);
    return NextResponse.json(
      { error: "Unable to save settings" },
      { status: 500 },
    );
  }
}
