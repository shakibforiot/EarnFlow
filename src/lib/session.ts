export type SessionUser = {
  id: string;
  email: string;
  name: string;
  balance: number;
  xp: number;
  level: number;
  streak: number;
  emailVerified?: boolean;
  country?: string;
  countryAuto?: boolean;
  timezone?: string;
  language?: string;
  phone?: string;
  paypalEmail?: string;
  cryptoAddress?: string;
  bkashNumber?: string;
  nagadNumber?: string;
  preferredCashout?: string;
  twoFactorEnabled?: boolean;
  kycStatus?: "none" | "pending" | "verified" | "rejected";
  kycFullName?: string;
  kycDob?: string;
  kycCountry?: string;
  kycAddress?: string;
  kycCity?: string;
  kycDocType?: string;
  kycIdNumberMasked?: string;
  kycSubmittedAt?: string | null;
  adminUnlocks?: {
    email?: boolean;
    country?: boolean;
    phone?: boolean;
    payout?: boolean;
    kyc?: boolean;
  };
  notifyOffers?: boolean;
  notifyCashout?: boolean;
  notifyNewsletter?: boolean;
  profilePrivate?: boolean;
  accountStatus?: "active" | "restricted" | "banned";
  banReason?: string | null;
  role?: "user" | "admin";
  district?: string;
  memberSince?: string;
  lastLoginAt?: string | null;
  referralCode?: string;
};

const KEY = "earnflow_user";

export function saveSession(user: SessionUser) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(user));
}

export function getSession(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}
