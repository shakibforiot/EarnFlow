import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { toAdminUser } from "@/lib/admin-user";
import { assertAdminAccess } from "@/lib/admin-auth";
import type { UnlockableField } from "@/lib/profile-locks";
import {
  MULTI_ACCOUNT_REASON,
  enforceSingleAccountPerIp,
} from "@/lib/ip-account-limit";
import { shouldEnforceIpLimit } from "@/lib/client-ip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UNLOCK_FIELDS: UnlockableField[] = [
  "email",
  "country",
  "phone",
  "payout",
  "kyc",
];

async function sameIpAccounts(ip: string, excludeId?: string) {
  if (!ip || ip === "unknown") return [];
  const rows = await User.find({
    $or: [{ signupIp: ip }, { lastIp: ip }],
  })
    .sort({ createdAt: 1 })
    .lean();
  return rows
    .filter((u) => !excludeId || u._id.toString() !== excludeId)
    .map((u) => toAdminUser(u as never));
}

export async function GET(request: Request) {
  try {
    const gate = await assertAdminAccess(request);
    if (!gate.ok) return gate.response;

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";
    const id = searchParams.get("id")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "all";
    const limit = Math.min(100, Number(searchParams.get("limit") || 40));

    await connectDB();

    if (id && mongoose.Types.ObjectId.isValid(id)) {
      const one = await User.findById(id).lean();
      if (!one) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      const user = toAdminUser(one as never);
      const ip = user.lastIp || user.signupIp;
      const related = await sameIpAccounts(ip, user.id);
      const allOnIp = await User.countDocuments({
        $or: [{ signupIp: ip }, { lastIp: ip }],
      });
      return NextResponse.json({
        user,
        users: [user],
        sameIpUsers: related,
        sameIpCount: allOnIp,
        sameIp: ip,
      });
    }

    const filter: Record<string, unknown> = {};
    if (q) {
      const looksLikeIp = /^[\d.:a-fA-F]+$/.test(q) && q.includes(".");
      filter.$or = looksLikeIp
        ? [{ signupIp: q }, { lastIp: q }]
        : [
            { email: { $regex: q, $options: "i" } },
            { name: { $regex: q, $options: "i" } },
            { signupIp: { $regex: q, $options: "i" } },
            { lastIp: { $regex: q, $options: "i" } },
            { district: { $regex: q, $options: "i" } },
          ];
    }
    if (status === "active" || status === "banned" || status === "restricted") {
      filter.accountStatus = status;
    } else if (status === "unverified") {
      filter.emailVerified = { $ne: true };
    } else if (status === "kyc") {
      filter.kycStatus = "pending";
    }

    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({
      users: users.map((u) => toAdminUser(u as never)),
      filter: { q, status, count: users.length },
    });
  } catch (err) {
    console.error("admin users GET", err);
    return NextResponse.json({ error: "Failed to list users" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      adminSecret?: string;
      adminUserId?: string;
      userId?: string;
      email?: string;
      action?:
        | "ban"
        | "unban"
        | "freeze"
        | "unfreeze"
        | "verifyEmail"
        | "unverifyEmail"
        | "unlock"
        | "unlockAll"
        | "lockField"
        | "setBalance"
        | "addBalance"
        | "setXp"
        | "approveKyc"
        | "rejectKyc"
        | "banIp"
        | "enforceIp"
        | "setDistrict";
      unlock?: UnlockableField[];
      banReason?: string;
      balance?: number;
      xp?: number;
      district?: string;
      resetLockedFields?: boolean;
      ip?: string;
    };

    const gate = await assertAdminAccess(request, body);
    if (!gate.ok) return gate.response;

    await connectDB();

    if (body.action === "banIp") {
      const ip = body.ip?.trim();
      if (!ip || ip === "unknown") {
        return NextResponse.json({ error: "IP required" }, { status: 400 });
      }
      const reason =
        body.banReason?.trim() ||
        `Banned by admin (IP ${ip} — multi account)`;
      const result = await User.updateMany(
        { $or: [{ signupIp: ip }, { lastIp: ip }] },
        { $set: { accountStatus: "banned", banReason: reason } },
      );
      return NextResponse.json({
        ok: true,
        banned: result.modifiedCount,
        ip,
      });
    }

    let user: InstanceType<typeof User> | null = null;
    if (body.userId && mongoose.Types.ObjectId.isValid(body.userId)) {
      user = (await User.findById(body.userId)) as InstanceType<
        typeof User
      > | null;
    } else if (body.email?.trim()) {
      user = (await User.findOne({
        email: body.email.trim().toLowerCase(),
      })) as InstanceType<typeof User> | null;
    }
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const action = body.action;
    if (!action) {
      return NextResponse.json({ error: "action required" }, { status: 400 });
    }

    switch (action) {
      case "ban":
        user.accountStatus = "banned";
        user.banReason = body.banReason?.trim() || "Banned by admin";
        break;
      case "unban":
        user.accountStatus = "active";
        user.banReason = null;
        break;
      case "freeze":
        user.accountStatus = "restricted";
        user.banReason = body.banReason?.trim() || "Account frozen by admin";
        break;
      case "unfreeze":
        user.accountStatus = "active";
        user.banReason = null;
        break;
      case "verifyEmail":
        user.emailVerified = true;
        user.emailVerifyCode = null;
        user.emailVerifyExpires = null;
        break;
      case "unverifyEmail":
        user.emailVerified = false;
        break;
      case "approveKyc":
        user.kycStatus = "verified";
        break;
      case "rejectKyc":
        user.kycStatus = "rejected";
        break;
      case "setDistrict":
        user.district = body.district?.trim() || "";
        break;
      case "setBalance": {
        const bal = Number(body.balance);
        if (!Number.isFinite(bal) || bal < 0) {
          return NextResponse.json({ error: "Invalid balance" }, { status: 400 });
        }
        user.balance = Math.round(bal);
        break;
      }
      case "addBalance": {
        const delta = Number(body.balance);
        if (!Number.isFinite(delta)) {
          return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
        }
        user.balance = Math.max(0, Math.round((user.balance || 0) + delta));
        break;
      }
      case "setXp": {
        const xp = Number(body.xp);
        if (!Number.isFinite(xp) || xp < 0) {
          return NextResponse.json({ error: "Invalid XP" }, { status: 400 });
        }
        user.xp = Math.round(xp);
        user.level = Math.max(1, Math.floor(user.xp / 100) + 1);
        break;
      }
      case "enforceIp": {
        const ip = (user.lastIp || user.signupIp || "").trim();
        if (!shouldEnforceIpLimit(ip)) {
          return NextResponse.json(
            { error: "No enforceable IP on this user" },
            { status: 400 },
          );
        }
        await user.save();
        const check = await enforceSingleAccountPerIp(ip);
        const refreshed = await User.findById(user._id);
        return NextResponse.json({
          ok: true,
          enforced: true,
          existingCount: check.existingCount,
          keeperId: "keeperId" in check ? check.keeperId : user._id.toString(),
          user: refreshed ? toAdminUser(refreshed) : toAdminUser(user),
          reason: MULTI_ACCOUNT_REASON,
        });
      }
      case "lockField": {
        const fields = (body.unlock ?? []).filter((f): f is UnlockableField =>
          UNLOCK_FIELDS.includes(f),
        );
        const unlocks = { ...(user.adminUnlocks ?? {}) };
        for (const f of fields) unlocks[f] = false;
        user.adminUnlocks = unlocks;
        user.markModified("adminUnlocks");
        break;
      }
      case "unlock":
      case "unlockAll": {
        const fields =
          action === "unlockAll"
            ? UNLOCK_FIELDS
            : (body.unlock ?? []).filter((f): f is UnlockableField =>
                UNLOCK_FIELDS.includes(f),
              );
        if (!fields.length) {
          return NextResponse.json(
            { error: "No unlock fields" },
            { status: 400 },
          );
        }
        const unlocks = { ...(user.adminUnlocks ?? {}) };
        for (const f of fields) unlocks[f] = true;
        user.adminUnlocks = unlocks;
        user.markModified("adminUnlocks");

        if (body.resetLockedFields) {
          for (const f of fields) {
            if (f === "email") user.emailVerified = false;
            if (f === "country") {
              user.country = "";
              user.countryAuto = true;
            }
            if (f === "phone") user.phone = "";
            if (f === "payout") {
              user.paypalEmail = "";
              user.cryptoAddress = "";
            }
            if (f === "kyc") {
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
          }
        }
        break;
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    await user.save();
    return NextResponse.json({ ok: true, user: toAdminUser(user) });
  } catch (err) {
    console.error("admin users PATCH", err);
    return NextResponse.json({ error: "User action failed" }, { status: 500 });
  }
}
