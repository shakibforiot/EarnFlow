import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { toPublicUser } from "@/lib/user-public";
import { getClientIp, isTrackableIp, shouldEnforceIpLimit } from "@/lib/client-ip";
import {
  MULTI_ACCOUNT_REASON,
  banUserForMultiAccount,
  enforceSingleAccountPerIp,
  isAccountBlocked,
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
    };

    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";
    const ip = getClientIp(request);

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    await connectDB();

    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    if (isAccountBlocked(user)) {
      return NextResponse.json(
        {
          error: user.banReason || "This account has been banned.",
          code: "ACCOUNT_BANNED",
        },
        { status: 403 },
      );
    }

    if (shouldEnforceIpLimit(ip)) {
      user.lastIp = ip;
      const others = await User.find({
        _id: { $ne: user._id },
        $or: [{ signupIp: ip }, { lastIp: ip }],
      })
        .sort({ createdAt: 1 })
        .limit(1);

      if (others.length > 0) {
        const older = others[0];
        if (user.createdAt >= older.createdAt) {
          await banUserForMultiAccount(user);
          return NextResponse.json(
            {
              error:
                "This account is banned — multiple accounts from the same IP.",
              code: "MULTI_ACCOUNT_IP",
            },
            { status: 403 },
          );
        }
      }

      await enforceSingleAccountPerIp(ip);
    }

    const fresh = await User.findById(user._id);
    if (!fresh || isAccountBlocked(fresh)) {
      return NextResponse.json(
        {
          error:
            fresh?.banReason ||
            MULTI_ACCOUNT_REASON ||
            "This account has been banned.",
          code: "ACCOUNT_BANNED",
        },
        { status: 403 },
      );
    }

    fresh.lastLoginAt = new Date();
    if (isTrackableIp(ip)) fresh.lastIp = ip;
    if (userIsAdmin(fresh) && fresh.role !== "admin") {
      fresh.role = "admin";
    }
    if (!fresh.district || !fresh.country) {
      const geo = await lookupGeoFromIp(ip);
      if (!fresh.country && geo.country) {
        fresh.country = geo.country;
        fresh.countryAuto = true;
      }
      if (!fresh.district && geo.district) fresh.district = geo.district;
      if (!fresh.timezone && geo.timezone) fresh.timezone = geo.timezone;
    }
    await fresh.save();

    return NextResponse.json({ user: toPublicUser(fresh) });
  } catch (err) {
    console.error("login error", err);
    return NextResponse.json(
      { error: "Login failed. Please try again." },
      { status: 500 },
    );
  }
}
