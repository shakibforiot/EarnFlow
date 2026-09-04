import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import {
  SupportChat,
  newMessageId,
  type SupportMessage,
} from "@/lib/models/SupportChat";
import { BOT_WELCOME, generateBotReply } from "@/lib/support-bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serialize(chat: {
  _id: mongoose.Types.ObjectId;
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

async function getOrCreateChat(userId: string) {
  const user = await User.findById(userId).select("name email");
  if (!user) return null;

  let chat = await SupportChat.findOne({
    userId,
    status: { $ne: "closed" },
  }).sort({ lastMessageAt: -1 });

  if (!chat) {
    const welcome: SupportMessage = {
      id: newMessageId(),
      role: "bot",
      text: BOT_WELCOME,
      createdAt: new Date(),
    };
    chat = await SupportChat.create({
      userId,
      userName: user.name,
      userEmail: user.email,
      status: "open",
      botEnabled: true,
      unreadAdmin: 0,
      unreadUser: 0,
      lastMessageAt: new Date(),
      messages: [welcome],
    });
  } else {
    chat.userName = user.name;
    chat.userEmail = user.email;
    await chat.save();
  }

  return chat;
}

/** GET — load open chat for user */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId")?.trim();
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    await connectDB();
    const chat = await getOrCreateChat(userId);
    if (!chat) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // mark user unread as read
    if (chat.unreadUser > 0) {
      chat.unreadUser = 0;
      await chat.save();
    }

    return NextResponse.json({ chat: serialize(chat) });
  } catch (err) {
    console.error("support GET", err);
    return NextResponse.json({ error: "Failed to load chat" }, { status: 500 });
  }
}

/** POST — user sends a message */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      userId?: string;
      text?: string;
      escalate?: boolean;
    };
    const userId = body.userId?.trim();
    const text = body.text?.trim();
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }
    if (!text || text.length > 2000) {
      return NextResponse.json(
        { error: "Message required (max 2000 chars)" },
        { status: 400 },
      );
    }

    await connectDB();
    const chat = await getOrCreateChat(userId);
    if (!chat) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userMsg: SupportMessage = {
      id: newMessageId(),
      role: "user",
      text,
      createdAt: new Date(),
    };
    chat.messages.push(userMsg);
    chat.lastMessageAt = new Date();
    chat.unreadAdmin += 1;

    const forceEscalate = Boolean(body.escalate);
    const shouldBot =
      chat.botEnabled && chat.status !== "admin_active" && !forceEscalate;

    if (forceEscalate || !shouldBot) {
      if (forceEscalate || chat.status === "open") {
        chat.status = "waiting_admin";
        chat.botEnabled = false;
        const sys: SupportMessage = {
          id: newMessageId(),
          role: "system",
          text: "Waiting for an admin to join this chat…",
          createdAt: new Date(),
        };
        chat.messages.push(sys);
      }
    } else {
      const reply = generateBotReply(text);
      const botMsg: SupportMessage = {
        id: newMessageId(),
        role: "bot",
        text: reply.text,
        createdAt: new Date(),
      };
      chat.messages.push(botMsg);
      chat.unreadUser += 1;

      if (reply.escalate) {
        chat.status = "waiting_admin";
        chat.botEnabled = false;
        chat.messages.push({
          id: newMessageId(),
          role: "system",
          text: "Escalated to admin. They will reply here.",
          createdAt: new Date(),
        });
      }
    }

    // cap message history
    if (chat.messages.length > 200) {
      chat.messages = chat.messages.slice(-200);
    }

    await chat.save();

    return NextResponse.json({ chat: serialize(chat) });
  } catch (err) {
    console.error("support POST", err);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}
