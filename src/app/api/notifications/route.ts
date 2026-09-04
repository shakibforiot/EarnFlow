import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Notification } from "@/lib/models/Notification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const userId = new URL(request.url).searchParams.get("userId")?.trim();
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }
    await connectDB();
    const rows = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(40)
      .lean();
    const unread = await Notification.countDocuments({
      userId,
      read: false,
    });
    return NextResponse.json({
      unread,
      notifications: rows.map((n) => ({
        id: n._id.toString(),
        type: n.type,
        title: n.title,
        body: n.body,
        href: n.href || "",
        read: n.read,
        createdAt: n.createdAt,
      })),
    });
  } catch (err) {
    console.error("notifications GET", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      userId?: string;
      ids?: string[];
      all?: boolean;
    };
    const userId = body.userId?.trim();
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }
    await connectDB();
    if (body.all) {
      await Notification.updateMany(
        { userId, read: false },
        { $set: { read: true } },
      );
    } else if (body.ids?.length) {
      await Notification.updateMany(
        {
          userId,
          _id: {
            $in: body.ids
              .filter((id) => mongoose.Types.ObjectId.isValid(id))
              .map((id) => new mongoose.Types.ObjectId(id)),
          },
        },
        { $set: { read: true } },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("notifications PATCH", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
