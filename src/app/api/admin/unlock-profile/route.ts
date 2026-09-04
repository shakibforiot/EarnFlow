import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { toPublicUser } from "@/lib/user-public";
import type { UnlockableField } from "@/lib/profile-locks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FIELDS: UnlockableField[] = [
  "email",
  "country",
  "phone",
  "payout",
  "kyc",
];

/**
 * Admin unlock / reset checklist fields so the user can redo them.
 * Header: x-admin-secret: ADMIN_SECRET from env
 */
export async function POST(request: Request) {
  try {
    const secret = request.headers.get("x-admin-secret") || "";
    const expected = process.env.ADMIN_SECRET || "";
    if (!expected || secret !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      userId?: string;
      email?: string;
      unlock?: UnlockableField[];
      /** Also reset values so checklist becomes Todo again */
      reset?: boolean;
    };

    const unlock = (body.unlock ?? []).filter((f): f is UnlockableField =>
      FIELDS.includes(f),
    );
    if (!unlock.length) {
      return NextResponse.json(
        { error: "Provide unlock: ['email'|'country'|'phone'|'payout'|'kyc']" },
        { status: 400 },
      );
    }

    await connectDB();
    const user = body.userId
      ? await User.findById(body.userId)
      : body.email
        ? await User.findOne({ email: body.email.trim().toLowerCase() })
        : null;

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    user.adminUnlocks = user.adminUnlocks || {};
    for (const field of unlock) {
      user.adminUnlocks[field] = true;

      if (body.reset) {
        if (field === "email") {
          user.emailVerified = false;
          user.emailVerifyCode = null;
          user.emailVerifyExpires = null;
        }
        if (field === "country") {
          user.country = "";
          user.countryAuto = true;
        }
        if (field === "phone") {
          user.phone = "";
        }
        if (field === "payout") {
          user.paypalEmail = "";
          user.cryptoAddress = "";
        }
        if (field === "kyc") {
          user.kycStatus = "none";
          user.kycFullName = "";
          user.kycDob = "";
          user.kycCountry = "";
          user.kycAddress = "";
          user.kycCity = "";
          user.kycDocType = "";
          user.kycIdNumber = "";
          user.kycSubmittedAt = null;
        }
      } else if (field === "kyc") {
        // Allow redo form without wiping unless reset=true
        user.kycStatus = "rejected";
      }
    }

    user.markModified("adminUnlocks");
    await user.save();

    return NextResponse.json({
      ok: true,
      unlocked: unlock,
      reset: Boolean(body.reset),
      user: toPublicUser(user),
    });
  } catch (err) {
    console.error("admin unlock error", err);
    return NextResponse.json({ error: "Unlock failed" }, { status: 500 });
  }
}
