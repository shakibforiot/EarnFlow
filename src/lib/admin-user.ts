import type { UserDocument } from "@/lib/models/User";
import { toPublicUser, type PublicUser } from "@/lib/user-public";

export type AdminUser = PublicUser & {
  signupIp: string;
  lastIp: string;
  referredBy: string | null;
  kycIdNumber: string;
  lastStreakAt: string | null;
  district: string;
};

export function toAdminUser(
  user: UserDocument | (UserDocument & { _id: { toString(): string } }),
): AdminUser {
  const base = toPublicUser(user);
  return {
    ...base,
    signupIp: user.signupIp || "",
    lastIp: user.lastIp || "",
    referredBy: user.referredBy || null,
    kycIdNumber: user.kycIdNumber || "",
    lastStreakAt: user.lastStreakAt
      ? new Date(user.lastStreakAt).toISOString()
      : null,
    district: user.district || base.district || "",
  };
}
