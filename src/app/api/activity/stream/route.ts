import {
  listActivity,
  subscribeActivity,
  subscribeActivitySnapshot,
  type ActivityEvent,
} from "@/lib/activity-store";
import { hydrateActivityFromDb } from "@/lib/hydrate-activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function encode(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET() {
  let unsubscribe = () => {};
  let unsubscribeSnapshot = () => {};
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let refresh: ReturnType<typeof setInterval> | undefined;
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const safeEnqueue = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
          if (heartbeat) clearInterval(heartbeat);
          if (refresh) clearInterval(refresh);
          unsubscribe();
          unsubscribeSnapshot();
        }
      };

      // Hydrate from Mongo first so clients never get an empty wipe
      let initial = listActivity();
      try {
        initial = await hydrateActivityFromDb(40);
      } catch (err) {
        console.error("activity stream hydrate", err);
      }
      safeEnqueue(encode("snapshot", { events: initial }));

      unsubscribe = subscribeActivity((activity: ActivityEvent) => {
        safeEnqueue(encode("activity", activity));
      });

      unsubscribeSnapshot = subscribeActivitySnapshot((events) => {
        if (events.length === 0 && listActivity().length > 0) return;
        safeEnqueue(encode("snapshot", { events }));
      });

      refresh = setInterval(() => {
        void (async () => {
          try {
            const events = await hydrateActivityFromDb(40);
            safeEnqueue(encode("snapshot", { events }));
          } catch {
            safeEnqueue(encode("snapshot", { events: listActivity() }));
          }
        })();
      }, 30000);

      heartbeat = setInterval(() => {
        safeEnqueue(": ping\n\n");
      }, 15000);
    },
    cancel() {
      closed = true;
      if (heartbeat) clearInterval(heartbeat);
      if (refresh) clearInterval(refresh);
      unsubscribe();
      unsubscribeSnapshot();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
