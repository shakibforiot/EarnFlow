import { NextResponse } from "next/server";
import { countryFromIso, normalizeCountryName } from "@/lib/countries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function fromProvider(
  url: string,
  map: (data: Record<string, unknown>) => {
    country: string;
    timezone: string;
    city: string;
  } | null,
) {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    return map(data);
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const headers = request.headers;
  const headerCountry =
    headers.get("x-vercel-ip-country") ||
    headers.get("cf-ipcountry") ||
    headers.get("x-country-code") ||
    "";

  let country = countryFromIso(headerCountry);
  let source = country ? "header" : "unknown";
  let timezone = "";
  let city = "";

  if (!country) {
    const who = await fromProvider("https://ipwho.is/", (data) => {
      if (data.success === false) return null;
      const c =
        countryFromIso(String(data.country_code || "")) ||
        normalizeCountryName(String(data.country || ""));
      if (!c) return null;
      return {
        country: c,
        timezone: String(data.timezone || ""),
        city: String(data.city || ""),
      };
    });
    if (who) {
      country = who.country;
      timezone = who.timezone;
      city = who.city;
      source = "ipwho";
    }
  }

  if (!country) {
    const ipapi = await fromProvider("https://ipapi.co/json/", (data) => {
      if (data.error) return null;
      const c =
        countryFromIso(String(data.country_code || "")) ||
        normalizeCountryName(String(data.country_name || ""));
      if (!c) return null;
      return {
        country: c,
        timezone: String(data.timezone || ""),
        city: String(data.city || ""),
      };
    });
    if (ipapi) {
      country = ipapi.country;
      timezone = ipapi.timezone;
      city = ipapi.city;
      source = "ipapi";
    }
  }

  return NextResponse.json({
    country: country || "",
    countryCode: headerCountry || "",
    timezone,
    city,
    source,
  });
}
