export const COUNTRY_LIST = [
  "Afghanistan",
  "Argentina",
  "Australia",
  "Bangladesh",
  "Belgium",
  "Brazil",
  "Canada",
  "China",
  "Egypt",
  "France",
  "Germany",
  "India",
  "Indonesia",
  "Italy",
  "Japan",
  "Malaysia",
  "Mexico",
  "Nepal",
  "Netherlands",
  "Nigeria",
  "Pakistan",
  "Philippines",
  "Poland",
  "Portugal",
  "Russia",
  "Saudi Arabia",
  "Singapore",
  "South Africa",
  "South Korea",
  "Spain",
  "Sri Lanka",
  "Sweden",
  "Switzerland",
  "Thailand",
  "Turkey",
  "Ukraine",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "Vietnam",
  "Other",
] as const;

/** ISO 3166-1 alpha-2 → display name used in EarnFlow */
export const ISO_TO_COUNTRY: Record<string, string> = {
  AF: "Afghanistan",
  AR: "Argentina",
  AU: "Australia",
  BD: "Bangladesh",
  BE: "Belgium",
  BR: "Brazil",
  CA: "Canada",
  CN: "China",
  EG: "Egypt",
  FR: "France",
  DE: "Germany",
  IN: "India",
  ID: "Indonesia",
  IT: "Italy",
  JP: "Japan",
  MY: "Malaysia",
  MX: "Mexico",
  NP: "Nepal",
  NL: "Netherlands",
  NG: "Nigeria",
  PK: "Pakistan",
  PH: "Philippines",
  PL: "Poland",
  PT: "Portugal",
  RU: "Russia",
  SA: "Saudi Arabia",
  SG: "Singapore",
  ZA: "South Africa",
  KR: "South Korea",
  ES: "Spain",
  LK: "Sri Lanka",
  SE: "Sweden",
  CH: "Switzerland",
  TH: "Thailand",
  TR: "Turkey",
  UA: "Ukraine",
  AE: "United Arab Emirates",
  GB: "United Kingdom",
  UK: "United Kingdom",
  US: "United States",
  VN: "Vietnam",
};

export function countryFromIso(code?: string | null): string {
  if (!code) return "";
  const key = code.trim().toUpperCase();
  return ISO_TO_COUNTRY[key] || "";
}

export function normalizeCountryName(raw?: string | null): string {
  if (!raw) return "";
  const name = raw.trim();
  const exact = COUNTRY_LIST.find(
    (c) => c.toLowerCase() === name.toLowerCase(),
  );
  if (exact) return exact;
  return name.slice(0, 60);
}

/** E.164 country calling codes for COUNTRY_LIST */
export const COUNTRY_DIAL_CODE: Record<string, string> = {
  Afghanistan: "+93",
  Argentina: "+54",
  Australia: "+61",
  Bangladesh: "+880",
  Belgium: "+32",
  Brazil: "+55",
  Canada: "+1",
  China: "+86",
  Egypt: "+20",
  France: "+33",
  Germany: "+49",
  India: "+91",
  Indonesia: "+62",
  Italy: "+39",
  Japan: "+81",
  Malaysia: "+60",
  Mexico: "+52",
  Nepal: "+977",
  Netherlands: "+31",
  Nigeria: "+234",
  Pakistan: "+92",
  Philippines: "+63",
  Poland: "+48",
  Portugal: "+351",
  Russia: "+7",
  "Saudi Arabia": "+966",
  Singapore: "+65",
  "South Africa": "+27",
  "South Korea": "+82",
  Spain: "+34",
  "Sri Lanka": "+94",
  Sweden: "+46",
  Switzerland: "+41",
  Thailand: "+66",
  Turkey: "+90",
  Ukraine: "+380",
  "United Arab Emirates": "+971",
  "United Kingdom": "+44",
  "United States": "+1",
  Vietnam: "+84",
  Other: "+",
};

export function dialCodeForCountry(country?: string | null): string {
  if (!country) return "";
  const key = normalizeCountryName(country);
  return COUNTRY_DIAL_CODE[key] || "";
}

/** Example placeholder using the country's dial code */
export function phonePlaceholderForCountry(country?: string | null): string {
  const dial = dialCodeForCountry(country);
  if (!dial || dial === "+") return "+XXXXXXXXXXX";
  // Keep examples short / recognizable per region
  if (dial === "+880") return "+8801XXXXXXXXX";
  if (dial === "+91") return "+91XXXXXXXXXX";
  if (dial === "+1") return "+1XXXXXXXXXX";
  if (dial === "+44") return "+44XXXXXXXXXX";
  return `${dial}XXXXXXXXX`;
}

/** True if value is empty or only a dial-code prefix */
export function isPhoneJustDialCode(phone: string, dial: string): boolean {
  const digits = phone.replace(/[^\d+]/g, "").trim();
  if (!digits) return true;
  if (!dial) return false;
  const normalized = digits.replace(/\s/g, "");
  return normalized === dial || normalized === dial.replace("+", "");
}
