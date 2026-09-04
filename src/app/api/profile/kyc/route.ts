import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { toPublicUser } from "@/lib/user-public";
import { isAccountBlocked } from "@/lib/ip-account-limit";
import { clearUnlockAfterEdit, isFieldLocked } from "@/lib/profile-locks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DOC_TYPES = ["national_id", "passport", "drivers_license"] as const;

function requireText(value: unknown, label: string, min = 2, max = 120) {
  if (typeof value !== "string") return `${label} is required`;
  const v = value.trim();
  if (v.length < min) return `${label} is required`;
  if (v.length > max) return `${label} is too long`;
  return null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      userId?: string;
      fullName?: string;
      dateOfBirth?: string;
      country?: string;
      address?: string;
      city?: string;
      documentType?: string;
      idNumber?: string;
    };

    const userId = body.userId?.trim();
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    const errors = [
      requireText(body.fullName, "Full legal name", 3, 80),
      requireText(body.dateOfBirth, "Date of birth", 8, 20),
      requireText(body.country, "Country", 2, 60),
      requireText(body.address, "Address", 5, 160),
      requireText(body.city, "City", 2, 80),
      requireText(body.documentType, "Document type", 3, 40),
      requireText(body.idNumber, "ID number", 4, 40),
    ].filter(Boolean);

    if (!DOC_TYPES.includes(body.documentType as (typeof DOC_TYPES)[number])) {
      errors.push("Select a valid ID document type");
    }

    const dob = String(body.dateOfBirth ?? "").trim();
    const dobDate = new Date(dob);
    if (Number.isNaN(dobDate.getTime())) {
      errors.push("Enter a valid date of birth");
    } else {
      const age =
        (Date.now() - dobDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      if (age < 18) errors.push("You must be at least 18 years old");
      if (age > 120) errors.push("Enter a valid date of birth");
    }

    if (errors.length) {
      return NextResponse.json(
        { error: errors[0], errors },
        { status: 400 },
      );
    }

    await connectDB();
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (isAccountBlocked(user)) {
      return NextResponse.json(
        {
          error: user.banReason || "This account is banned.",
          code: "ACCOUNT_BANNED",
        },
        { status: 403 },
      );
    }

    if (isFieldLocked(user, "kyc")) {
      return NextResponse.json(
        {
          error:
            "KYC already submitted. Contact admin if you need to redo verification.",
          code: "FIELD_LOCKED",
          field: "kyc",
        },
        { status: 409 },
      );
    }

    user.kycFullName = String(body.fullName).trim();
    user.kycDob = dob;
    user.kycCountry = String(body.country).trim();
    user.kycAddress = String(body.address).trim();
    user.kycCity = String(body.city).trim();
    user.kycDocType = String(body.documentType).trim();
    user.kycIdNumber = String(body.idNumber).trim().toUpperCase();
    user.kycSubmittedAt = new Date();
    user.kycStatus = "pending";
    if (user.adminUnlocks?.kyc) {
      user.adminUnlocks = clearUnlockAfterEdit(user.adminUnlocks, "kyc");
      user.markModified("adminUnlocks");
    }

    if (!user.country?.trim()) {
      user.country = user.kycCountry;
    }

    await user.save();

    return NextResponse.json({
      ok: true,
      user: toPublicUser(user),
      message: "KYC submitted for review.",
    });
  } catch (err) {
    console.error("kyc submit error", err);
    return NextResponse.json(
      { error: "KYC submission failed" },
      { status: 500 },
    );
  }
}
