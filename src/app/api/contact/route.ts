import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { ContactMessage } from "@/lib/models/ContactMessage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      subject?: string;
      message?: string;
      userId?: string;
    };

    const name = body.name?.trim() || "";
    const email = body.email?.trim().toLowerCase() || "";
    const subject = body.subject?.trim() || "";
    const message = body.message?.trim() || "";

    if (!name || name.length > 80) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }
    if (!subject || subject.length > 120) {
      return NextResponse.json({ error: "Subject is required" }, { status: 400 });
    }
    if (!message || message.length < 10 || message.length > 4000) {
      return NextResponse.json(
        { error: "Message must be 10–4000 characters" },
        { status: 400 },
      );
    }

    await connectDB();
    await ContactMessage.create({
      name,
      email,
      subject,
      message,
      userId:
        body.userId && mongoose.Types.ObjectId.isValid(body.userId)
          ? body.userId
          : undefined,
      status: "new",
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("contact POST", err);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}
