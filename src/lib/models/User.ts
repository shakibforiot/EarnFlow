import mongoose, { Schema, models, model } from "mongoose";

export type AccountStatus = "active" | "restricted" | "banned";

export type UserDocument = {
  _id: mongoose.Types.ObjectId;
  email: string;
  passwordHash: string;
  name: string;
  balance: number;
  xp: number;
  level: number;
  streak: number;
  emailVerified: boolean;
  emailVerifyCode?: string | null;
  emailVerifyExpires?: Date | null;
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
  kycIdNumber: string;
  kycSubmittedAt?: Date | null;
  adminUnlocks: {
    email?: boolean;
    country?: boolean;
    phone?: boolean;
    payout?: boolean;
    kyc?: boolean;
  };
  notifyOffers: boolean;
  notifyCashout: boolean;
  notifyNewsletter: boolean;
  profilePrivate: boolean;
  accountStatus: AccountStatus;
  banReason?: string | null;
  role: "user" | "admin";
  district: string;
  signupIp: string;
  lastIp: string;
  referredBy?: string | null;
  lastStreakAt?: Date | null;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const UserSchema = new Schema<UserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    balance: { type: Number, default: 0 },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    streak: { type: Number, default: 0 },
    emailVerified: { type: Boolean, default: false },
    emailVerifyCode: { type: String, default: null },
    emailVerifyExpires: { type: Date, default: null },
    country: { type: String, default: "", trim: true },
    countryAuto: { type: Boolean, default: true },
    timezone: { type: String, default: "", trim: true },
    language: { type: String, default: "en", trim: true },
    phone: { type: String, default: "", trim: true },
    paypalEmail: { type: String, default: "", trim: true, lowercase: true },
    cryptoAddress: { type: String, default: "", trim: true },
    preferredCashout: { type: String, default: "PayPal", trim: true },
    twoFactorEnabled: { type: Boolean, default: false },
    kycStatus: {
      type: String,
      enum: ["none", "pending", "verified", "rejected"],
      default: "none",
    },
    kycFullName: { type: String, default: "", trim: true },
    kycDob: { type: String, default: "", trim: true },
    kycCountry: { type: String, default: "", trim: true },
    kycAddress: { type: String, default: "", trim: true },
    kycCity: { type: String, default: "", trim: true },
    kycDocType: { type: String, default: "", trim: true },
    kycIdNumber: { type: String, default: "", trim: true },
    kycSubmittedAt: { type: Date, default: null },
    adminUnlocks: {
      email: { type: Boolean, default: false },
      country: { type: Boolean, default: false },
      phone: { type: Boolean, default: false },
      payout: { type: Boolean, default: false },
      kyc: { type: Boolean, default: false },
    },
    notifyOffers: { type: Boolean, default: true },
    notifyCashout: { type: Boolean, default: true },
    notifyNewsletter: { type: Boolean, default: false },
    profilePrivate: { type: Boolean, default: false },
    accountStatus: {
      type: String,
      enum: ["active", "restricted", "banned"],
      default: "active",
      index: true,
    },
    banReason: { type: String, default: null },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      index: true,
    },
    district: { type: String, default: "", trim: true },
    signupIp: { type: String, default: "", index: true },
    lastIp: { type: String, default: "", index: true },
    referredBy: { type: String, default: null, index: true },
    lastStreakAt: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true },
);

UserSchema.index({ signupIp: 1, createdAt: 1 });

// Next.js HMR keeps a stale compiled model — drop & recompile so new paths
// (emailVerified, KYC, locks, etc.) are not stripped on read.
if (models.User) {
  delete models.User;
}

export const User = model<UserDocument>("User", UserSchema);
