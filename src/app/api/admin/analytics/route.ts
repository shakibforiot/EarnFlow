import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { CashoutRequest } from "@/lib/models/CashoutRequest";
import { Activity } from "@/lib/models/Activity";
import { ContactMessage } from "@/lib/models/ContactMessage";
import { SupportChat } from "@/lib/models/SupportChat";
import { assertAdminAccess } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const gate = await assertAdminAccess(request);
    if (!gate.ok) return gate.response;

    await connectDB();
    const days = 14;
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - (days - 1));

    const [signups, cashouts, earns, contactNew, chatWaiting] =
      await Promise.all([
        User.aggregate([
          { $match: { createdAt: { $gte: since } } },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
        CashoutRequest.aggregate([
          { $match: { createdAt: { $gte: since } } },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
              },
              count: { $sum: 1 },
              usd: { $sum: "$amountUsd" },
              approved: {
                $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] },
              },
            },
          },
          { $sort: { _id: 1 } },
        ]),
        Activity.aggregate([
          { $match: { type: "earn", createdAt: { $gte: since } } },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
        ContactMessage.countDocuments({ status: "new" }),
        SupportChat.countDocuments({
          status: { $in: ["waiting_admin", "admin_active"] },
        }),
      ]);

    const dayKeys: string[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      dayKeys.push(d.toISOString().slice(0, 10));
    }

    const mapCount = (rows: { _id: string; count: number }[]) => {
      const m = new Map(rows.map((r) => [r._id, r.count]));
      return dayKeys.map((k) => ({ date: k, count: m.get(k) || 0 }));
    };

    return NextResponse.json({
      days: dayKeys,
      signups: mapCount(signups),
      earningsEvents: mapCount(earns),
      cashouts: dayKeys.map((k) => {
        const hit = cashouts.find((c) => c._id === k);
        return {
          date: k,
          count: hit?.count || 0,
          usd: hit?.usd || 0,
          approved: hit?.approved || 0,
        };
      }),
      totals: {
        signups: signups.reduce((s, r) => s + r.count, 0),
        cashoutUsd: cashouts.reduce((s, r) => s + (r.usd || 0), 0),
        contactNew,
        chatWaiting,
      },
    });
  } catch (err) {
    console.error("analytics", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
