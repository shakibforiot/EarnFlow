import type { SessionUser } from "@/lib/session";

export type UnlockableField =
  | "email"
  | "country"
  | "phone"
  | "payout"
  | "kyc";

export type AdminUnlocks = Partial<Record<UnlockableField, boolean>>;

type LockUser = {
  emailVerified?: boolean;
  country?: string;
  phone?: string;
  paypalEmail?: string;
  cryptoAddress?: string;
  kycStatus?: string;
  adminUnlocks?: AdminUnlocks | null;
};

export function hasPayoutMethod(user: LockUser | null | undefined) {
  return Boolean(user?.paypalEmail?.trim() || user?.cryptoAddress?.trim());
}

export function isFieldLocked(
  user: LockUser | SessionUser | null | undefined,
  field: UnlockableField,
) {
  const unlocks = user?.adminUnlocks ?? {};
  if (unlocks[field]) return false;

  switch (field) {
    case "email":
      return Boolean(user?.emailVerified);
    case "country":
      return Boolean(user?.country?.trim());
    case "phone":
      return Boolean(user?.phone?.trim());
    case "payout":
      return hasPayoutMethod(user);
    case "kyc":
      return (
        user?.kycStatus === "pending" || user?.kycStatus === "verified"
      );
    default:
      return false;
  }
}

export function clearUnlockAfterEdit(
  unlocks: AdminUnlocks | null | undefined,
  field: UnlockableField,
): AdminUnlocks {
  const next = { ...(unlocks ?? {}) };
  next[field] = false;
  return next;
}
