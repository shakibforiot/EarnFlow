import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { CashoutRequest } from "@/lib/models/CashoutRequest";
import { User } from "@/lib/models/User";
import { assertAdminAccess } from "@/lib/admin-auth";
import { pushNotification } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function makeGiftCode() {
  const chunk = () =>
    Math.random().toString(36).slice(2, 6).toUpperCase();
  return `EF-${chunk()}-${chunk()}-${chunk()}`;
}

export async function GET(request: Request) {
  try {
    const gate = await assertAdminAccess(request);
    if (!gate.ok) return gate.response;

    const status = new URL(request.url).searchParams.get("status") || "pending";
    await connectDB();
    const filter =
      status === "all"
        ? {}
        : { status: status as "pending" | "approved" | "rejected" };

    const rows = await CashoutRequest.find(filter)
      .sort({ createdAt: -1 })
      .limit(80)
      .lean();

    const userIds = [...new Set(rows.map((r) => r.userId.toString()))];
    const users = await User.find({
      _id: { $in: userIds.map((id) => new mongoose.Types.ObjectId(id)) },
    })
      .select("email name signupIp lastIp district accountStatus")
      .lean();
    const byId = new Map(users.map((u) => [u._id.toString(), u]));

    return NextResponse.json({
      cashouts: rows.map((r) => {
        const u = byId.get(r.userId.toString());
        return {
          id: r._id.toString(),
          userId: r.userId.toString(),
          email: u?.email || "",
          name: u?.name || "",
          method: r.methodName,
          amountUsd: r.amountUsd,
          coins: r.coins,
          status: r.status,
          giftCode: r.giftCode || null,
          adminNote: r.adminNote || null,
          createdAt: r.createdAt,
          signupIp: u?.signupIp || "",
          lastIp: u?.lastIp || "",
          district: u?.district || "",
          accountStatus: u?.accountStatus || "active",
        };
      }),
    });
  } catch (err) {
    console.error("admin cashouts GET", err);
    return NextResponse.json({ error: "Failed to load cashouts" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      adminSecret?: string;
      adminUserId?: string;
      cashoutId?: string;
      action?: "approve" | "reject";
      giftCode?: string;
      adminNote?: string;
    };
    const gate = await assertAdminAccess(request, body);
    if (!gate.ok) return gate.response;

    const id = body.cashoutId?.trim();
    if (!id || !mongoose.Types.ObjectId.isValid(id) || !body.action) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    await connectDB();
    const row = await CashoutRequest.findById(id);
    if (!row) {
      return NextResponse.json({ error: "Cashout not found" }, { status: 404 });
    }
    if (row.status !== "pending") {
      return NextResponse.json(
        { error: "Cashout already processed" },
        { status: 409 },
      );
    }

    if (body.action === "approve") {
      const gift =
        body.giftCode?.trim() ||
        (/(gift|amazon|steam|google|apple|visa|starbucks)/i.test(
          row.methodName,
        )
          ? makeGiftCode()
          : null);
      row.status = "approved";
      row.giftCode = gift;
      row.adminNote = body.adminNote?.trim() || null;
      await row.save();

      const msg = gift
        ? `Your $${row.amountUsd.toFixed(2)} ${row.methodName} cash out was approved. Code: ${gift}`
        : `Your $${row.amountUsd.toFixed(2)} ${row.methodName} cash out was approved.`;

      await pushNotification({
        userId: row.userId.toString(),
        type: "cashout_approved",
        title: "Cash out approved",
        body: msg,
        href: "/dashboard/profile",
        email: true,
      });

      return NextResponse.json({
        ok: true,
        status: "approved",
        giftCode: gift,
      });
    }

    row.status = "rejected";
    row.adminNote = body.adminNote?.trim() || null;
    await row.save();
    const user = await User.findById(row.userId);
    if (user) {
      user.balance += row.coins;
      await user.save();
    }

    await pushNotification({
      userId: row.userId.toString(),
      type: "cashout_rejected",
      title: "Cash out rejected",
      body: `Your $${row.amountUsd.toFixed(2)} request was rejected. ${row.coins} coins were refunded.${
        body.adminNote ? ` Note: ${body.adminNote}` : ""
      }`,
      href: "/dashboard/cashout",
      email: true,
    });

    return NextResponse.json({ ok: true, status: "rejected", refunded: true });
  } catch (err) {
    console.error("admin cashouts PATCH", err);
    return NextResponse.json({ error: "Cashout action failed" }, { status: 500 });
  }
}
