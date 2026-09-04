export function getClientIp(request: Request): string {
  const headers = request.headers;
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp =
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    headers.get("true-client-ip") ||
    headers.get("x-client-ip") ||
    "";

  return realIp.trim() || "unknown";
}

export function isLoopbackIp(ip: string) {
  const v = ip.trim().toLowerCase();
  return (
    v === "127.0.0.1" ||
    v === "::1" ||
    v === "0:0:0:0:0:0:0:1" ||
    v === "::ffff:127.0.0.1" ||
    v.startsWith("::ffff:127.")
  );
}

/** Tracked for storage; multi-account ban skips loopback (local dev). */
export function isTrackableIp(ip: string) {
  return Boolean(ip && ip !== "unknown");
}

export function shouldEnforceIpLimit(ip: string) {
  return isTrackableIp(ip) && !isLoopbackIp(ip);
}
