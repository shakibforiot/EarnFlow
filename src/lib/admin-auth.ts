import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User, type UserDocument } from "@/lib/models/User";

export function adminSecretFromBodyOrHeader(
  request: Request,
  bodySecret?: string,
): string {
  return (
    request.headers.get("x-admin-secret") ||
    bodySecret?.trim() ||
    ""
  );
}

export function isAdminSecretValid(secret: string): boolean {
  const expected = process.env.ADMIN_SECRET || "";
  return Boolean(expected && secret === expected);
}

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAIL || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function userIsAdmin(
  user: Pick<UserDocument, "email" | "role"> | null | undefined,
): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  const emails = adminEmails();
  return emails.includes((user.email || "").toLowerCase());
}

export function adminUserIdFromRequest(request: Request, bodyUserId?: string) {
  return (
    request.headers.get("x-admin-user-id")?.trim() ||
    bodyUserId?.trim() ||
    ""
  );
}

/**
 * Admin access: logged-in admin user (role / ADMIN_EMAIL) OR valid ADMIN_SECRET.
 * Prefer session user for panel; secret kept for bootstrap/scripts.
 */
export async function assertAdminAccess(
  request: Request,
  body?: { adminSecret?: string; adminUserId?: string },
): Promise<
  | { ok: true; via: "secret" | "session"; userId?: string }
  | { ok: false; response: NextResponse }
> {
  const secret = adminSecretFromBodyOrHeader(request, body?.adminSecret);
  if (isAdminSecretValid(secret)) {
    return { ok: true, via: "secret" };
  }

  const userId = adminUserIdFromRequest(request, body?.adminUserId);
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "Login required. Sign in first, then open /admin.",
          code: "LOGIN_REQUIRED",
        },
        { status: 401 },
      ),
    };
  }

  await connectDB();
  const user = await User.findById(userId).lean();
  if (!user || !userIsAdmin(user as UserDocument)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            "This account is not an admin. Set ADMIN_EMAIL to your login email or role=admin.",
          code: "NOT_ADMIN",
        },
        { status: 403 },
      ),
    };
  }

  // Soft-promote ADMIN_EMAIL matches
  if ((user as UserDocument).role !== "admin" && userIsAdmin(user as UserDocument)) {
    await User.updateOne({ _id: user._id }, { $set: { role: "admin" } });
  }

  return { ok: true, via: "session", userId };
}

export function requireAdminSecret(request: Request): NextResponse | null {
  const secret = request.headers.get("x-admin-secret") || "";
  if (!isAdminSecretValid(secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
