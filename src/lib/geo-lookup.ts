import { countryFromIso, normalizeCountryName } from "@/lib/countries";

export type GeoInfo = {
  country: string;
  district: string;
  timezone: string;
};

/** Resolve country + district (jila/region) from client IP */
export async function lookupGeoFromIp(ip: string): Promise<GeoInfo> {
  const empty: GeoInfo = { country: "", district: "", timezone: "" };
  if (!ip || ip === "unknown" || ip === "127.0.0.1" || ip === "::1") {
    return empty;
  }

  try {
    const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return empty;
    const data = (await res.json()) as {
      country_code?: string;
      country_name?: string;
      region?: string;
      city?: string;
      timezone?: string;
      error?: boolean;
    };
    if (data.error) return empty;
    const country =
      countryFromIso(data.country_code) ||
      normalizeCountryName(data.country_name) ||
      "";
    const district = (data.region || data.city || "").trim();
    return {
      country,
      district,
      timezone: data.timezone || "",
    };
  } catch {
    return empty;
  }
}
