import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { toPublicUser } from "@/lib/user-public";
import { userIsAdmin } from "@/lib/admin-auth";
import mongoose from "mongoose";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Check if logged-in user can open /admin */
export async function GET(request: Request) {
  try {
    const userId =
      request.headers.get("x-admin-user-id") ||
      new URL(request.url).searchParams.get("userId") ||
      "";
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { ok: false, code: "LOGIN_REQUIRED", error: "Login required" },
        { status: 401 },
      );
    }

    await connectDB();
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { ok: false, code: "LOGIN_REQUIRED", error: "User not found" },
        { status: 401 },
      );
    }

    if (!userIsAdmin(user)) {
      return NextResponse.json(
        {
          ok: false,
          code: "NOT_ADMIN",
          error:
            "Not an admin account. Add your email to ADMIN_EMAIL in .env.local",
        },
        { status: 403 },
      );
    }

    if (user.role !== "admin") {
      user.role = "admin";
      await user.save();
    }

    return NextResponse.json({
      ok: true,
      user: toPublicUser(user),
    });
  } catch (err) {
    console.error("admin access", err);
    return NextResponse.json({ error: "Access check failed" }, { status: 500 });
  }
}
