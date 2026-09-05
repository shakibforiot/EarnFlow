import type { SessionUser } from "@/lib/session";
import { hasPayoutMethod } from "@/lib/offerwall";

export type CompletenessItem = {
  key: string;
  label: string;
  done: boolean;
  href: string;
};

type CompletenessUser = {
  emailVerified?: boolean;
  country?: string;
  paypalEmail?: string;
  cryptoAddress?: string;
  bkashNumber?: string;
  nagadNumber?: string;
  phone?: string;
  kycStatus?: string;
};

export function getCompletenessItems(
  user: CompletenessUser | SessionUser | null | undefined,
): CompletenessItem[] {
  return [
    {
      key: "email",
      label: "Verify email",
      done: user?.emailVerified === true,
      href: "/dashboard/profile",
    },
    {
      key: "country",
      label: "Set country",
      done: Boolean(user?.country?.trim()),
      href: "/dashboard/profile",
    },
    {
      key: "payout",
      label: "Add PayPal, crypto, bKash, or Nagad",
      done: hasPayoutMethod(user || {}),
      href: "/dashboard/profile",
    },
    {
      key: "phone",
      label: "Add phone number",
      done: Boolean(user?.phone?.trim()),
      href: "/dashboard/profile",
    },
    {
      key: "kyc",
      label: "Complete KYC (all fields + ID number)",
      done:
        user?.kycStatus === "pending" || user?.kycStatus === "verified",
      href: "/dashboard/profile",
    },
  ];
}

export function isProfileComplete(
  user: CompletenessUser | SessionUser | null | undefined,
) {
  return getCompletenessItems(user).every((item) => item.done);
}

export function missingProfileLabels(
  user: CompletenessUser | SessionUser | null | undefined,
) {
  return getCompletenessItems(user)
    .filter((item) => !item.done)
    .map((item) => item.label);
}
