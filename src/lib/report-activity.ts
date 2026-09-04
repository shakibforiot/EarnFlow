import type { ActivityInput, ActivityEvent } from "@/lib/activity-store";

/**
 * Call this from earn / cashout flows so the live ticker updates in real time.
 *
 *   await reportActivity({ type: "earn", user: username, amount: 250, source: "Offer" });
 *   await reportActivity({ type: "cashout", user: username, amount: 500 });
 */
export async function reportActivity(
  input: ActivityInput,
  baseUrl?: string,
): Promise<ActivityEvent> {
  const origin =
    baseUrl ??
    (typeof window !== "undefined" ? window.location.origin : "");

  const res = await fetch(`${origin}/api/activity`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      typeof err.error === "string" ? err.error : "Failed to report activity",
    );
  }

  const data = (await res.json()) as { event: ActivityEvent };
  return data.event;
}
