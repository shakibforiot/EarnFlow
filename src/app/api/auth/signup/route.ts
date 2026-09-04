import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { toPublicUser } from "@/lib/user-public";
import { getClientIp, shouldEnforceIpLimit } from "@/lib/client-ip";
import {
  MULTI_ACCOUNT_REASON,
  banUserForMultiAccount,
  enforceSingleAccountPerIp,
} from "@/lib/ip-account-limit";
import { lookupGeoFromIp } from "@/lib/geo-lookup";
import { userIsAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      name?: string;
      referralCode?: string;
    };

    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";
    const referralCode = body.referralCode?.trim().toUpperCase() || "";
    const name =
      body.name?.trim() ||
      (email ? email.split("@")[0] : "") ||
      "User";
    const ip = getClientIp(request);

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 },
      );
    }

    await connectDB();

    const existing = await User.findOne({ email }).lean();
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 },
      );
    }

    // Same IP already has an account → block / ban multi-account attempt
    if (shouldEnforceIpLimit(ip)) {
      const sameIp = await User.countDocuments({
        $or: [{ signupIp: ip }, { lastIp: ip }],
      });
      if (sameIp >= 1) {
        await enforceSingleAccountPerIp(ip);
        return NextResponse.json(
          {
            error:
              "Only 1 account allowed per IP. Extra accounts are banned.",
            code: "MULTI_ACCOUNT_IP",
          },
          { status: 403 },
        );
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);

    let referredBy: string | null = null;
    let referrer: InstanceType<typeof User> | null = null;
    if (referralCode.startsWith("EF") && referralCode.length >= 4) {
      const suffix = referralCode.slice(2);
      referrer = await User.findOne({
        $expr: {
          $regexMatch: {
            input: { $toString: "$_id" },
            regex: `${suffix}$`,
            options: "i",
          },
        },
      });
      if (referrer) referredBy = referrer._id.toString();
    }

    const geo = await lookupGeoFromIp(ip);

    const user = await User.create({
      email,
      passwordHash,
      name,
      balance: referredBy ? 50 : 0,
      xp: referredBy ? 5 : 0,
      level: 1,
      streak: 0,
      emailVerified: false,
      signupIp: ip,
      lastIp: ip,
      country: geo.country,
      district: geo.district,
      timezone: geo.timezone,
      countryAuto: true,
      referredBy,
      accountStatus: "active",
      role: userIsAdmin({ email, role: "user" }) ? "admin" : "user",
      lastLoginAt: new Date(),
    });

    if (referrer && referrer._id.toString() !== user._id.toString()) {
      referrer.balance += 100;
      referrer.xp += 5;
      await referrer.save();
    }

    // Race-safe: if another account appeared on this IP, ban extras
    const check = await enforceSingleAccountPerIp(ip);
    if (!check.allowed && check.keeperId !== user._id.toString()) {
      await banUserForMultiAccount(user);
      return NextResponse.json(
        {
          error: MULTI_ACCOUNT_REASON,
          code: "MULTI_ACCOUNT_IP",
        },
        { status: 403 },
      );
    }

    return NextResponse.json({ user: toPublicUser(user) }, { status: 201 });
  } catch (err) {
    console.error("signup error", err);
    return NextResponse.json(
      { error: "Signup failed. Please try again in a moment." },
      { status: 500 },
    );
  }
}
