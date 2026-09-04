import { countryFromIso, normalizeCountryName, ISO_TO_COUNTRY } from "@/lib/countries";

/** Common IANA timezones → country when IP geo fails */
const TZ_TO_COUNTRY: Record<string, string> = {
  "Asia/Dhaka": "Bangladesh",
  "Asia/Kolkata": "India",
  "Asia/Calcutta": "India",
  "Asia/Karachi": "Pakistan",
  "Asia/Kathmandu": "Nepal",
  "Asia/Colombo": "Sri Lanka",
  "Asia/Jakarta": "Indonesia",
  "Asia/Manila": "Philippines",
  "Asia/Bangkok": "Thailand",
  "Asia/Singapore": "Singapore",
  "Asia/Kuala_Lumpur": "Malaysia",
  "Asia/Tokyo": "Japan",
  "Asia/Seoul": "South Korea",
  "Asia/Shanghai": "China",
  "Asia/Hong_Kong": "China",
  "Asia/Dubai": "United Arab Emirates",
  "Asia/Riyadh": "Saudi Arabia",
  "Europe/London": "United Kingdom",
  "Europe/Berlin": "Germany",
  "Europe/Paris": "France",
  "Europe/Madrid": "Spain",
  "Europe/Rome": "Italy",
  "Europe/Amsterdam": "Netherlands",
  "Europe/Warsaw": "Poland",
  "Europe/Lisbon": "Portugal",
  "Europe/Stockholm": "Sweden",
  "Europe/Zurich": "Switzerland",
  "Europe/Moscow": "Russia",
  "Europe/Kyiv": "Ukraine",
  "America/New_York": "United States",
  "America/Chicago": "United States",
  "America/Denver": "United States",
  "America/Los_Angeles": "United States",
  "America/Toronto": "Canada",
  "America/Vancouver": "Canada",
  "America/Sao_Paulo": "Brazil",
  "America/Mexico_City": "Mexico",
  "America/Argentina/Buenos_Aires": "Argentina",
  "Australia/Sydney": "Australia",
  "Australia/Melbourne": "Australia",
  "Africa/Cairo": "Egypt",
  "Africa/Lagos": "Nigeria",
  "Africa/Johannesburg": "South Africa",
};

export type DetectedGeo = {
  country: string;
  timezone: string;
  city: string;
  source: string;
};

async function tryFetchJson(url: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** ipwho.is returns timezone as an object; others return a string */
function asTimezone(value: unknown, fallback = ""): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id?: unknown }).id;
    if (typeof id === "string" && id.trim()) return id.trim();
  }
  return fallback;
}

export async function detectGeoClient(): Promise<DetectedGeo> {
  const timezone =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone || ""
      : "";

  // 1) Own API (headers / server IP)
  try {
    const res = await fetch("/api/geo", { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as DetectedGeo;
      if (data.country) {
        return {
          country: data.country,
          timezone: data.timezone || timezone,
          city: data.city || "",
          source: data.source || "api",
        };
      }
    }
  } catch {
    /* continue */
  }

  // 2) Browser → ipwho.is
  const who = await tryFetchJson("https://ipwho.is/");
  if (who && who.success !== false) {
    const country =
      countryFromIso(String(who.country_code || "")) ||
      normalizeCountryName(String(who.country || ""));
    if (country) {
      return {
        country,
        timezone: asTimezone(who.timezone, timezone),
        city: String(who.city || ""),
        source: "ipwho",
      };
    }
  }

  // 3) Browser → ipapi.co
  const ipapi = await tryFetchJson("https://ipapi.co/json/");
  if (ipapi && !ipapi.error) {
    const country =
      countryFromIso(String(ipapi.country_code || "")) ||
      normalizeCountryName(String(ipapi.country_name || ""));
    if (country) {
      return {
        country,
        timezone: asTimezone(ipapi.timezone, timezone),
        city: String(ipapi.city || ""),
        source: "ipapi",
      };
    }
  }

  // 4) Timezone fallback
  if (timezone && TZ_TO_COUNTRY[timezone]) {
    return {
      country: TZ_TO_COUNTRY[timezone],
      timezone,
      city: "",
      source: "timezone",
    };
  }

  // 5) Locale region (en-US → US)
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale || "";
    const region = locale.split("-")[1]?.toUpperCase();
    if (region && ISO_TO_COUNTRY[region]) {
      return {
        country: ISO_TO_COUNTRY[region],
        timezone,
        city: "",
        source: "locale",
      };
    }
  } catch {
    /* ignore */
  }

  return { country: "", timezone, city: "", source: "none" };
}
