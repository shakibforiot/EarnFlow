import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import {
  SupportChat,
  newMessageId,
  type SupportMessage,
} from "@/lib/models/SupportChat";
import { assertAdminAccess } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serialize(chat: {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  status: string;
  botEnabled: boolean;
  unreadUser: number;
  unreadAdmin: number;
  lastMessageAt: Date;
  messages: SupportMessage[];
  userName: string;
  userEmail: string;
}) {
  return {
    id: chat._id.toString(),
    userId: chat.userId.toString(),
    status: chat.status,
    botEnabled: chat.botEnabled,
    unreadUser: chat.unreadUser,
    unreadAdmin: chat.unreadAdmin,
    lastMessageAt: chat.lastMessageAt,
    userName: chat.userName,
    userEmail: chat.userEmail,
    messages: chat.messages.map((m) => ({
      id: m.id,
      role: m.role,
      text: m.text,
      createdAt: m.createdAt,
    })),
  };
}

/** GET — list threads or one thread */
export async function GET(request: Request) {
  try {
    const gate = await assertAdminAccess(request);
    if (!gate.ok) return gate.response;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id")?.trim();
    const status = searchParams.get("status")?.trim() || "all";

    await connectDB();

    if (id) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json({ error: "Invalid id" }, { status: 400 });
      }
      const chat = await SupportChat.findById(id);
      if (!chat) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      if (chat.unreadAdmin > 0) {
        chat.unreadAdmin = 0;
        await chat.save();
      }
      return NextResponse.json({ chat: serialize(chat) });
    }

    const filter: Record<string, unknown> = {};
    if (status !== "all") filter.status = status;

    const rows = await SupportChat.find(filter)
      .sort({ lastMessageAt: -1 })
      .limit(80)
      .lean();

    const waiting = await SupportChat.countDocuments({
      status: { $in: ["waiting_admin", "admin_active"] },
    });

    return NextResponse.json({
      waiting,
      chats: rows.map((c) => ({
        id: c._id.toString(),
        userId: c.userId.toString(),
        userName: c.userName,
        userEmail: c.userEmail,
        status: c.status,
        botEnabled: c.botEnabled,
        unreadAdmin: c.unreadAdmin,
        lastMessageAt: c.lastMessageAt,
        preview:
          c.messages?.[c.messages.length - 1]?.text?.slice(0, 80) || "",
      })),
    });
  } catch (err) {
    console.error("admin support GET", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

/** POST — admin reply / take over / release bot / close */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      adminSecret?: string;
      adminUserId?: string;
      chatId?: string;
      text?: string;
      action?: "reply" | "takeover" | "enable_bot" | "close";
    };
    const gate = await assertAdminAccess(request, body);
    if (!gate.ok) return gate.response;

    const chatId = body.chatId?.trim();
    if (!chatId || !mongoose.Types.ObjectId.isValid(chatId)) {
      return NextResponse.json({ error: "Invalid chat" }, { status: 400 });
    }

    await connectDB();
    const chat = await SupportChat.findById(chatId);
    if (!chat) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const action = body.action || "reply";

    if (action === "takeover") {
      chat.status = "admin_active";
      chat.botEnabled = false;
      chat.messages.push({
        id: newMessageId(),
        role: "system",
        text: "Admin joined the chat.",
        createdAt: new Date(),
      });
      chat.lastMessageAt = new Date();
      await chat.save();
      return NextResponse.json({ chat: serialize(chat) });
    }

    if (action === "enable_bot") {
      chat.botEnabled = true;
      chat.status = "open";
      chat.messages.push({
        id: newMessageId(),
        role: "system",
        text: "Bot is back online for this chat.",
        createdAt: new Date(),
      });
      chat.lastMessageAt = new Date();
      await chat.save();
      return NextResponse.json({ chat: serialize(chat) });
    }

    if (action === "close") {
      chat.status = "closed";
      chat.messages.push({
        id: newMessageId(),
        role: "system",
        text: "Chat closed by admin.",
        createdAt: new Date(),
      });
      chat.lastMessageAt = new Date();
      chat.unreadUser += 1;
      await chat.save();
      return NextResponse.json({ chat: serialize(chat) });
    }

    const text = body.text?.trim();
    if (!text || text.length > 4000) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    chat.status = "admin_active";
    chat.botEnabled = false;
    chat.messages.push({
      id: newMessageId(),
      role: "admin",
      text,
      createdAt: new Date(),
    });
    chat.lastMessageAt = new Date();
    chat.unreadUser += 1;
    chat.unreadAdmin = 0;
    if (chat.messages.length > 200) {
      chat.messages = chat.messages.slice(-200);
    }
    await chat.save();

    return NextResponse.json({ chat: serialize(chat) });
  } catch (err) {
    console.error("admin support POST", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
