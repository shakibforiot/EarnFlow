import { ACTIVITY_TTL_MS } from "@/lib/activity-ttl";
import { connectDB } from "@/lib/mongodb";
import { Activity } from "@/lib/models/Activity";
import {
  setActivityEvents,
  listActivity,
  type ActivityEvent,
  type ActivityType,
} from "@/lib/activity-store";

/** Load recent Activity docs into the in-memory live feed */
export async function hydrateActivityFromDb(
  limit = 30,
): Promise<ActivityEvent[]> {
  await connectDB();
  const since = new Date(Date.now() - ACTIVITY_TTL_MS);
  const docs = await Activity.find({ createdAt: { $gte: since } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  const events: ActivityEvent[] = docs.map((doc) => ({
    id: doc._id.toString(),
    type: doc.type as ActivityType,
    user: doc.user,
    amount: String(doc.amount),
    source: doc.source || "Earn",
    userId: doc.userId ? doc.userId.toString() : undefined,
    createdAt: new Date(doc.createdAt).getTime(),
  }));

  setActivityEvents(events);
  return listActivity(limit);
}
