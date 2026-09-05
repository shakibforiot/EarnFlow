import { createHash } from "crypto";

/** Bangladesh mobile: 01XXXXXXXXX */
export function isBdMobile(value: string) {
  return /^01[3-9]\d{8}$/.test(value.replace(/[\s-]/g, ""));
}

export function normalizeBdMobile(value: string) {
  return value.replace(/[\s-]/g, "").trim();
}

export function hasPayoutMethod(user: {
  paypalEmail?: string | null;
  cryptoAddress?: string | null;
  bkashNumber?: string | null;
  nagadNumber?: string | null;
}) {
  return Boolean(
    user.paypalEmail?.trim() ||
      user.cryptoAddress?.trim() ||
      user.bkashNumber?.trim() ||
      user.nagadNumber?.trim(),
  );
}

export function md5Hex(text: string) {
  return createHash("md5").update(text).digest("hex");
}

export type WallProvider = {
  id: "adgem" | "pubscale";
  name: string;
  description: string;
  enabled: boolean;
  accent: string;
};

export function configuredWallProviders(): WallProvider[] {
  const adgemUrl = process.env.ADGEM_OFFERWALL_URL?.trim();
  const adgemApp = process.env.ADGEM_APP_ID?.trim();
  const pubUrl = process.env.PUBSCALE_OFFERWALL_URL?.trim();
  const pubApp = process.env.PUBSCALE_APP_ID?.trim();

  return [
    {
      id: "adgem",
      name: "AdGem Offers",
      description: "Games, apps, and surveys via AdGem. Rewards credit automatically.",
      enabled: Boolean(adgemUrl || adgemApp),
      accent: "from-violet-500/20 to-cyan-500/10",
    },
    {
      id: "pubscale",
      name: "PubScale Offerwall",
      description: "Partner offers via PubScale. Complete tasks to earn coins.",
      enabled: Boolean(pubUrl || pubApp),
      accent: "from-emerald-500/20 to-cyan-500/10",
    },
  ];
}

/** Build partner offerwall URL with EarnFlow user id as player/user id. */
export function buildWallLaunchUrl(
  provider: "adgem" | "pubscale",
  userId: string,
): string | null {
  if (provider === "adgem") {
    const template = process.env.ADGEM_OFFERWALL_URL?.trim();
    if (template) {
      return template
        .replaceAll("{user_id}", encodeURIComponent(userId))
        .replaceAll("{playerid}", encodeURIComponent(userId))
        .replaceAll("{player_id}", encodeURIComponent(userId));
    }
    const appId = process.env.ADGEM_APP_ID?.trim();
    if (!appId) return null;
    // Common AdGem web offerwall pattern — override with ADGEM_OFFERWALL_URL if needed
    return `https://api.adgem.com/v1/wall?appid=${encodeURIComponent(appId)}&playerid=${encodeURIComponent(userId)}`;
  }

  const template = process.env.PUBSCALE_OFFERWALL_URL?.trim();
  if (template) {
    return template
      .replaceAll("{user_id}", encodeURIComponent(userId))
      .replaceAll("{unique_id}", encodeURIComponent(userId));
  }
  const appId = process.env.PUBSCALE_APP_ID?.trim();
  const pubKey = process.env.PUBSCALE_PUB_KEY?.trim();
  if (!appId) return null;
  const base = `https://offerwall.pubscale.com/offerwall`;
  const qs = new URLSearchParams({
    app_id: appId,
    unique_id: userId,
  });
  if (pubKey) qs.set("pub_key", pubKey);
  if (process.env.PUBSCALE_SANDBOX === "true") qs.set("sandbox", "1");
  return `${base}?${qs.toString()}`;
}
