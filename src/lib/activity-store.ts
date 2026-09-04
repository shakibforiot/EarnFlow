import { ACTIVITY_TTL_MS } from "@/lib/activity-ttl";

export type ActivityType = "earn" | "cashout";

export type ActivityEvent = {
  id: string;
  type: ActivityType;
  /** Display name already masked, e.g. maya•• */
  user: string;
  /** Coin amount as string/number display */
  amount: string;
  /** "Cash Out" or offer/provider name */
  source: string;
  /** Owner user id for profile links */
  userId?: string;
  createdAt: number;
};

export type ActivityInput = {
  type: ActivityType;
  user: string;
  amount: string | number;
  source?: string;
  userId?: string;
};

type Listener = (event: ActivityEvent) => void;
type SnapshotListener = (events: ActivityEvent[]) => void;

const MAX_EVENTS = 40;

export { ACTIVITY_TTL_MS };

const listeners = new Set<Listener>();
const snapshotListeners = new Set<SnapshotListener>();

function maskUser(raw: string) {
  const clean = raw.trim().replace(/\s+/g, "");
  if (!clean) return "user••";
  if (clean.includes("•")) return clean;
  const base = clean.slice(0, 4);
  return `${base}••`;
}

/** Starts empty — only real earn / cashout events appear here */
let events: ActivityEvent[] = [];

function pruneExpired() {
  const cutoff = Date.now() - ACTIVITY_TTL_MS;
  const next = events.filter((e) => e.createdAt >= cutoff);
  if (next.length !== events.length) {
    events = next;
    snapshotListeners.forEach((listener) => listener([...events]));
  }
}

export function listActivity(limit = 30): ActivityEvent[] {
  pruneExpired();
  return events.slice(0, limit);
}

export function setActivityEvents(next: ActivityEvent[]) {
  const cutoff = Date.now() - ACTIVITY_TTL_MS;
  events = next
    .filter((e) => e.createdAt >= cutoff)
    .slice(0, MAX_EVENTS);
}

export function clearActivity() {
  if (events.length === 0) return;
  events = [];
  snapshotListeners.forEach((listener) => listener([]));
}

export function publishActivity(input: ActivityInput): ActivityEvent {
  pruneExpired();

  const event: ActivityEvent = {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: input.type,
    user: maskUser(input.user),
    amount: String(input.amount),
    source:
      input.source?.trim() ||
      (input.type === "cashout" ? "Cash Out" : "Offer"),
    userId: input.userId,
    createdAt: Date.now(),
  };

  events = [event, ...events].slice(0, MAX_EVENTS);
  listeners.forEach((listener) => listener(event));
  return event;
}

export function subscribeActivity(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function subscribeActivitySnapshot(
  listener: SnapshotListener,
): () => void {
  snapshotListeners.add(listener);
  return () => snapshotListeners.delete(listener);
}
