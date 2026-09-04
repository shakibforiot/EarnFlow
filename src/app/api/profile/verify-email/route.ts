import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { toPublicUser } from "@/lib/user-public";
import type { UserDocument } from "@/lib/models/User";
import { sendMail } from "@/lib/mail";
import { pushNotification } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function makeCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function usersCol() {
  await connectDB();
  const db = mongoose.connection.db;
  if (!db) throw new Error("Database not connected");
  return db.collection("users");
}

function isVerified(raw: Record<string, unknown> | null | undefined) {
  return raw?.emailVerified === true;
}

function publicFromRaw(raw: Record<string, unknown>) {
  return toPublicUser(raw as unknown as UserDocument);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      userId?: string;
      action?: "send" | "confirm" | "instant";
      code?: string;
    };

    const userId = body.userId?.trim();
    const action = body.action || "send";

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    const oid = new mongoose.Types.ObjectId(userId);
    const col = await usersCol();
    let raw = (await col.findOne({ _id: oid })) as Record<
      string,
      unknown
    > | null;
    if (!raw) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (isVerified(raw)) {
      return NextResponse.json({
        ok: true,
        alreadyVerified: true,
        verified: true,
        user: publicFromRaw(raw),
      });
    }

    // One-click verify (no SMTP configured yet)
    if (action === "instant") {
      await col.updateOne(
        { _id: oid },
        {
          $set: { emailVerified: true },
          $unset: { emailVerifyCode: "", emailVerifyExpires: "" },
        },
      );
      raw = (await col.findOne({ _id: oid })) as Record<string, unknown> | null;
      if (!raw) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      return NextResponse.json({
        ok: true,
        verified: true,
        user: publicFromRaw(raw),
      });
    }

    if (action === "send") {
      const code = makeCode();
      const expires = new Date(Date.now() + 30 * 60 * 1000);
      const updated = await col.updateOne(
        { _id: oid },
        {
          $set: {
            emailVerifyCode: code,
            emailVerifyExpires: expires,
          },
        },
      );
      if (updated.matchedCount === 0) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const email = String(raw.email || "");
      const mail = await sendMail({
        to: email,
        subject: "Your EarnFlow verification code",
        text: `Your EarnFlow email verification code is ${code}. It expires in 30 minutes.`,
        html: `<p>Your verification code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:4px">${code}</p><p>Expires in 30 minutes.</p>`,
      });

      return NextResponse.json({
        ok: true,
        sent: true,
        expiresInMinutes: 30,
        /** Only returned when SMTP/Resend is not configured (dev fallback) */
        code: mail.mode === "log" ? code : undefined,
        mailed: mail.mode === "resend",
        message:
          mail.mode === "resend"
            ? "Check your inbox for the verification code."
            : "Dev mode: code shown below (set RESEND_API_KEY to email it).",
      });
    }

    if (action === "confirm") {
      const code = body.code?.trim();
      if (!code) {
        return NextResponse.json(
          { error: "Enter the 6-digit code first." },
          { status: 400 },
        );
      }

      const stored =
        raw.emailVerifyCode != null ? String(raw.emailVerifyCode) : "";
      const expiresAt = raw.emailVerifyExpires
        ? new Date(raw.emailVerifyExpires as string | Date).getTime()
        : 0;

      if (!stored || !expiresAt || expiresAt < Date.now()) {
        return NextResponse.json(
          {
            error:
              "Code expired or missing. Click Send verification code again.",
          },
          { status: 410 },
        );
      }

      if (stored !== code) {
        return NextResponse.json(
          { error: "Invalid code. Check the digits and try again." },
          { status: 400 },
        );
      }

      await col.updateOne(
        { _id: oid },
        {
          $set: { emailVerified: true },
          $unset: { emailVerifyCode: "", emailVerifyExpires: "" },
        },
      );

      raw = (await col.findOne({ _id: oid })) as Record<string, unknown> | null;
      if (!raw) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      await pushNotification({
        userId,
        type: "email_verified",
        title: "Email verified",
        body: "Your email is verified. You can continue unlocking cash out.",
        href: "/dashboard/profile",
      });

      return NextResponse.json({
        ok: true,
        verified: true,
        user: publicFromRaw(raw),
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("verify email error", err);
    return NextResponse.json(
      { error: "Email verification failed. Try again." },
      { status: 500 },
    );
  }
}
