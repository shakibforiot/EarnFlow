import type { Document } from "mongoose";
import { User, type UserDocument } from "@/lib/models/User";
import { shouldEnforceIpLimit } from "@/lib/client-ip";

type UserModel = Document & UserDocument;

const MULTI_ACCOUNT_REASON =
  "Multiple accounts detected from the same IP address";

/**
 * One IP may keep only the oldest account active.
 * Any extra accounts on that IP are banned.
 */
export async function enforceSingleAccountPerIp(ip: string) {
  if (!shouldEnforceIpLimit(ip)) {
    return { allowed: true as const, existingCount: 0 };
  }

  const accounts = (await User.find({
    $or: [{ signupIp: ip }, { lastIp: ip }],
  })
    .sort({ createdAt: 1 })
    .exec()) as UserModel[];

  if (accounts.length <= 1) {
    return { allowed: true as const, existingCount: accounts.length };
  }

  const [oldest, ...rest] = accounts;
  for (const account of rest) {
    if (account.accountStatus !== "banned") {
      account.accountStatus = "banned";
      account.banReason = MULTI_ACCOUNT_REASON;
      await account.save();
    }
  }

  return {
    allowed: false as const,
    existingCount: accounts.length,
    keeperId: oldest?._id.toString(),
  };
}

export async function banUserForMultiAccount(user: UserModel) {
  user.accountStatus = "banned";
  user.banReason = MULTI_ACCOUNT_REASON;
  await user.save();
}

export function isAccountBlocked(user: {
  accountStatus?: string;
}) {
  return user.accountStatus === "banned" || user.accountStatus === "restricted";
}

export { MULTI_ACCOUNT_REASON };
