import type { UserDocument } from "@/lib/models/User";

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  balance: number;
  xp: number;
  level: number;
  streak: number;
  emailVerified: boolean;
  country: string;
  countryAuto: boolean;
  timezone: string;
  language: string;
  phone: string;
  paypalEmail: string;
  cryptoAddress: string;
  preferredCashout: string;
  twoFactorEnabled: boolean;
  kycStatus: "none" | "pending" | "verified" | "rejected";
  kycFullName: string;
  kycDob: string;
  kycCountry: string;
  kycAddress: string;
  kycCity: string;
  kycDocType: string;
  /** Masked for client display */
  kycIdNumberMasked: string;
  kycSubmittedAt: string | null;
  adminUnlocks: {
    email: boolean;
    country: boolean;
    phone: boolean;
    payout: boolean;
    kyc: boolean;
  };
  notifyOffers: boolean;
  notifyCashout: boolean;
  notifyNewsletter: boolean;
  profilePrivate: boolean;
  accountStatus: "active" | "restricted" | "banned";
  banReason: string | null;
  role: "user" | "admin";
  district: string;
  memberSince: string;
  lastLoginAt: string | null;
  referralCode: string;
};

export function toPublicUser(
  user: UserDocument | (UserDocument & { _id: { toString(): string } }),
): PublicUser {
  const id =
    typeof user._id === "string" ? user._id : user._id.toString();
  const rawId = user.kycIdNumber ?? "";
  const masked =
    rawId.length <= 4
      ? rawId
      : `${"*".repeat(Math.max(0, rawId.length - 4))}${rawId.slice(-4)}`;

  return {
    id,
    email: user.email,
    name: user.name,
    balance: user.balance ?? 0,
    xp: user.xp ?? 0,
    level: user.level ?? 1,
    streak: user.streak ?? 0,
    emailVerified: user.emailVerified === true,
    country: user.country ?? "",
    countryAuto: user.countryAuto ?? true,
    timezone: (() => {
      const tz = user.timezone as unknown;
      if (typeof tz === "string") {
        if (!tz || tz === "[object Object]") return "";
        return tz;
      }
      if (tz && typeof tz === "object" && "id" in tz) {
        const id = (tz as { id?: unknown }).id;
        return typeof id === "string" ? id : "";
      }
      return "";
    })(),
    language: user.language ?? "en",
    phone: user.phone ?? "",
    paypalEmail: user.paypalEmail ?? "",
    cryptoAddress: user.cryptoAddress ?? "",
    preferredCashout: user.preferredCashout ?? "PayPal",
    twoFactorEnabled: Boolean(user.twoFactorEnabled),
    kycStatus: user.kycStatus ?? "none",
    kycFullName: user.kycFullName ?? "",
    kycDob: user.kycDob ?? "",
    kycCountry: user.kycCountry ?? "",
    kycAddress: user.kycAddress ?? "",
    kycCity: user.kycCity ?? "",
    kycDocType: user.kycDocType ?? "",
    kycIdNumberMasked: masked,
    kycSubmittedAt: user.kycSubmittedAt
      ? new Date(user.kycSubmittedAt).toISOString()
      : null,
    adminUnlocks: {
      email: Boolean(user.adminUnlocks?.email),
      country: Boolean(user.adminUnlocks?.country),
      phone: Boolean(user.adminUnlocks?.phone),
      payout: Boolean(user.adminUnlocks?.payout),
      kyc: Boolean(user.adminUnlocks?.kyc),
    },
    notifyOffers: user.notifyOffers ?? true,
    notifyCashout: user.notifyCashout ?? true,
    notifyNewsletter: user.notifyNewsletter ?? false,
    profilePrivate: Boolean(user.profilePrivate),
    accountStatus: user.accountStatus ?? "active",
    banReason: user.banReason ?? null,
    role: user.role === "admin" ? "admin" : "user",
    district: user.district ?? "",
    memberSince: user.createdAt
      ? new Date(user.createdAt).toISOString()
      : new Date().toISOString(),
    lastLoginAt: user.lastLoginAt
      ? new Date(user.lastLoginAt).toISOString()
      : null,
    referralCode: `EF${id.slice(-6).toUpperCase()}`,
  };
}
