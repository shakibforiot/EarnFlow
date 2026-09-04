import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { RedeemCode } from "@/lib/models/RedeemCode";
import { assertAdminAccess } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const gate = await assertAdminAccess(request);
    if (!gate.ok) return gate.response;
    await connectDB();
    const codes = await RedeemCode.find({
      code: { $not: /^__RESET_/ },
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return NextResponse.json({
      codes: codes.map((c) => ({
        id: c._id.toString(),
        code: c.code,
        coins: c.coins,
        maxUses: c.maxUses,
        usedCount: c.usedCount,
        active: c.active,
        expiresAt: c.expiresAt,
        redeemedByCount: c.redeemedBy?.length ?? 0,
      })),
    });
  } catch (err) {
    console.error("admin redeem GET", err);
    return NextResponse.json({ error: "Failed to load codes" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      adminSecret?: string;
      adminUserId?: string;
      code?: string;
      coins?: number;
      maxUses?: number;
      active?: boolean;
      expiresAt?: string | null;
    };
    const gate = await assertAdminAccess(request, body);
    if (!gate.ok) return gate.response;

    const code = body.code?.trim().toUpperCase();
    const coins = Number(body.coins);
    if (!code || !Number.isFinite(coins) || coins < 1) {
      return NextResponse.json(
        { error: "code and coins required" },
        { status: 400 },
      );
    }

    await connectDB();
    const doc = await RedeemCode.findOneAndUpdate(
      { code },
      {
        $set: {
          coins,
          maxUses: Number(body.maxUses) || 0,
          active: body.active !== false,
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        },
        $setOnInsert: {
          code,
          usedCount: 0,
          redeemedBy: [],
        },
      },
      { upsert: true, new: true },
    );

    return NextResponse.json({
      ok: true,
      code: {
        id: doc._id.toString(),
        code: doc.code,
        coins: doc.coins,
        maxUses: doc.maxUses,
        usedCount: doc.usedCount,
        active: doc.active,
        expiresAt: doc.expiresAt,
      },
    });
  } catch (err) {
    console.error("admin redeem POST", err);
    return NextResponse.json({ error: "Failed to save code" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      adminSecret?: string;
      adminUserId?: string;
      codeId?: string;
      code?: string;
      action?: "resetUses" | "deactivate" | "activate" | "delete";
    };
    const gate = await assertAdminAccess(request, body);
    if (!gate.ok) return gate.response;

    await connectDB();
    let doc: InstanceType<typeof RedeemCode> | null = null;
    if (body.codeId && mongoose.Types.ObjectId.isValid(body.codeId)) {
      doc = (await RedeemCode.findById(
        body.codeId,
      )) as InstanceType<typeof RedeemCode> | null;
    } else if (body.code) {
      doc = (await RedeemCode.findOne({
        code: body.code.trim().toUpperCase(),
      })) as InstanceType<typeof RedeemCode> | null;
    }
    if (!doc) {
      return NextResponse.json({ error: "Code not found" }, { status: 404 });
    }

    if (body.action === "delete") {
      await doc.deleteOne();
      return NextResponse.json({ ok: true, deleted: true });
    }
    if (body.action === "resetUses") {
      doc.usedCount = 0;
      doc.redeemedBy = [];
      await doc.save();
      return NextResponse.json({ ok: true, reset: true });
    }
    if (body.action === "deactivate") {
      doc.active = false;
      await doc.save();
      return NextResponse.json({ ok: true, active: false });
    }
    if (body.action === "activate") {
      doc.active = true;
      await doc.save();
      return NextResponse.json({ ok: true, active: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("admin redeem PATCH", err);
    return NextResponse.json({ error: "Failed to update code" }, { status: 500 });
  }
}
