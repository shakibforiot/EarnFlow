import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { ContactMessage } from "@/lib/models/ContactMessage";
import { assertAdminAccess } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const gate = await assertAdminAccess(request);
    if (!gate.ok) return gate.response;

    const status = new URL(request.url).searchParams.get("status") || "all";
    await connectDB();
    const filter =
      status === "all" ? {} : { status: status as "new" | "read" | "replied" };

    const rows = await ContactMessage.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const unread = await ContactMessage.countDocuments({ status: "new" });

    return NextResponse.json({
      unread,
      messages: rows.map((m) => ({
        id: m._id.toString(),
        name: m.name,
        email: m.email,
        subject: m.subject,
        message: m.message,
        status: m.status,
        userId: m.userId?.toString() || null,
        createdAt: m.createdAt,
      })),
    });
  } catch (err) {
    console.error("admin contact GET", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      adminSecret?: string;
      adminUserId?: string;
      id?: string;
      status?: "new" | "read" | "replied";
    };
    const gate = await assertAdminAccess(request, body);
    if (!gate.ok) return gate.response;

    const id = body.id?.trim();
    if (!id || !mongoose.Types.ObjectId.isValid(id) || !body.status) {
      return NextResponse.json({ error: "Invalid" }, { status: 400 });
    }
    await connectDB();
    await ContactMessage.findByIdAndUpdate(id, { status: body.status });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin contact PATCH", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
