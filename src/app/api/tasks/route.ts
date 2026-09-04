import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { Activity } from "@/lib/models/Activity";
import { OfferCompletion } from "@/lib/models/OfferCompletion";
import { TaskClaim, utcDayKey } from "@/lib/models/TaskClaim";
import { publishActivity } from "@/lib/activity-store";
import { toPublicUser } from "@/lib/user-public";
import { dailyTasks } from "@/data/dashboard";
import { isAccountBlocked } from "@/lib/ip-account-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function taskEligible(userId: mongoose.Types.ObjectId, taskId: string) {
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);

  switch (taskId) {
    case "task-faucet": {
      const hit = await Activity.findOne({
        userId,
        source: "Faucet",
        type: "earn",
        createdAt: { $gte: dayStart },
      }).lean();
      return Boolean(hit);
    }
    case "task-offer": {
      const hit = await OfferCompletion.findOne({
        userId,
        createdAt: { $gte: dayStart },
      }).lean();
      return Boolean(hit);
    }
    case "task-profile": {
      // Soft unlock: claimable after visiting Profile at least once this session
      return true;
    }
    case "task-streak": {
      const user = await User.findById(userId).select("lastStreakAt").lean();
      if (!user?.lastStreakAt) return false;
      return new Date(user.lastStreakAt).getTime() >= dayStart.getTime();
    }
    default:
      return false;
  }
}

export async function GET(request: Request) {
  try {
    const userId = new URL(request.url).searchParams.get("userId")?.trim();
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    await connectDB();
    const dayKey = utcDayKey();
    const claims = await TaskClaim.find({ userId, dayKey }).lean();
    const claimed = new Set(claims.map((c) => c.taskId));

    const tasks = await Promise.all(
      dailyTasks.map(async (task) => {
        const done = claimed.has(task.id);
        const eligible = done
          ? true
          : await taskEligible(new mongoose.Types.ObjectId(userId), task.id);
        return {
          ...task,
          done,
          eligible,
          canClaim: eligible && !done,
        };
      }),
    );

    return NextResponse.json({ dayKey, tasks });
  } catch (err) {
    console.error("tasks get error", err);
    return NextResponse.json({ error: "Could not load tasks" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      userId?: string;
      taskId?: string;
    };
    const userId = body.userId?.trim();
    const taskId = body.taskId?.trim();
    const task = dailyTasks.find((t) => t.id === taskId);

    if (!userId || !task || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { error: "User and task are required" },
        { status: 400 },
      );
    }

    await connectDB();
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (isAccountBlocked(user)) {
      return NextResponse.json(
        { error: user.banReason || "This account is banned.", code: "ACCOUNT_BANNED" },
        { status: 403 },
      );
    }

    const dayKey = utcDayKey();
    const eligible = await taskEligible(user._id, task.id);
    if (!eligible) {
      return NextResponse.json(
        { error: "Finish the requirement before claiming this task." },
        { status: 400 },
      );
    }

    try {
      await TaskClaim.create({
        userId: user._id,
        taskId: task.id,
        dayKey,
        coins: task.reward,
      });
    } catch (err: unknown) {
      const code =
        err && typeof err === "object" && "code" in err
          ? (err as { code?: number }).code
          : undefined;
      if (code === 11000) {
        return NextResponse.json(
          { error: "Task already claimed today." },
          { status: 409 },
        );
      }
      throw err;
    }

    user.balance += task.reward;
    user.xp += 1;
    await user.save();

    const masked = `${user.name.slice(0, 4)}••`;
    publishActivity({
      type: "earn",
      user: masked,
      amount: task.reward,
      source: "Daily Task",
      userId: user._id.toString(),
    });
    await Activity.create({
      type: "earn",
      user: masked,
      amount: String(task.reward),
      source: "Daily Task",
      userId: user._id,
    });

    return NextResponse.json({
      ok: true,
      coins: task.reward,
      user: toPublicUser(user),
    });
  } catch (err) {
    console.error("tasks claim error", err);
    return NextResponse.json({ error: "Claim failed" }, { status: 500 });
  }
}
