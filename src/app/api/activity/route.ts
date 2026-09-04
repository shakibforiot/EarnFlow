import { NextResponse } from "next/server";
import {
  ACTIVITY_TTL_MS,
  listActivity,
  publishActivity,
  type ActivityType,
} from "@/lib/activity-store";
import { connectDB } from "@/lib/mongodb";
import { Activity } from "@/lib/models/Activity";
import { hydrateActivityFromDb } from "@/lib/hydrate-activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const events = await hydrateActivityFromDb(40);
    return NextResponse.json({ events, live: true, ttlMs: ACTIVITY_TTL_MS });
  } catch (err) {
    console.error("activity GET", err);
    return NextResponse.json({
      events: listActivity(),
      live: true,
      fallback: true,
      ttlMs: ACTIVITY_TTL_MS,
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      type?: ActivityType;
      user?: string;
      amount?: string | number;
      source?: string;
      userId?: string;
    };

    if (!body.type || (body.type !== "earn" && body.type !== "cashout")) {
      return NextResponse.json(
        { error: "type must be 'earn' or 'cashout'" },
        { status: 400 },
      );
    }

    if (!body.user || body.amount === undefined || body.amount === "") {
      return NextResponse.json(
        { error: "user and amount are required" },
        { status: 400 },
      );
    }

    const event = publishActivity({
      type: body.type,
      user: body.user,
      amount: body.amount,
      source: body.source,
      userId: body.userId,
    });

    try {
      await connectDB();
      const doc = await Activity.create({
        type: event.type,
        user: event.user,
        amount: event.amount,
        source: event.source,
        userId: body.userId || undefined,
      });
      event.id = doc._id.toString();
    } catch (err) {
      console.error("activity persist", err);
    }

    return NextResponse.json({ event }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}
