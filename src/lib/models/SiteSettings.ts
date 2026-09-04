import { Schema, models, model } from "mongoose";

export type SiteSettingsDocument = {
  _id: string;
  /** Kill switch — site returns 503 / maintenance */
  maintenanceMode: boolean;
  maintenanceMessage: string;
  /** Force internal error mode (500) for non-admin */
  forceErrorMode: boolean;

  faucetCoins: number;
  faucetCooldownSec: number;

  minCashoutUsd: number;
  cashoutEnabled: boolean;

  streakBaseReward: number;
  streakEnabled: boolean;

  landingHeadline: string;
  landingSubheadline: string;
  landingCta: string;

  leaderboardEnabled: boolean;
  leaderboardTitle: string;
  leaderboardLimit: number;
  rankPrizes: { place: number; coins: number; label: string }[];
  /** Partner S2S postback secret (optional; env OFFERWALL_SECRET preferred) */
  offerwallSecret?: string;
  lastPrizePayoutAt?: Date | string | null;

  offers: {
    id: string;
    title: string;
    provider: string;
    reward: number;
    coins: number;
    category: "game" | "survey" | "offer" | "app" | "ptc";
    time: string;
    difficulty: "Easy" | "Medium" | "Hard";
    featured?: boolean;
    image: string;
  }[];

  offerWalls: {
    id: string;
    name: string;
    description: string;
    offers: number;
    accent: string;
    image: string;
  }[];

  surveys: {
    id: string;
    title: string;
    provider: string;
    reward: number;
    coins: number;
    time: string;
    image: string;
  }[];

  updatedAt?: Date;
};

const SETTINGS_ID = "main";

const SiteSettingsSchema = new Schema<SiteSettingsDocument>(
  {
    _id: { type: String, default: SETTINGS_ID },
    maintenanceMode: { type: Boolean, default: false },
    maintenanceMessage: {
      type: String,
      default: "EarnFlow is under maintenance. Please check back soon.",
    },
    forceErrorMode: { type: Boolean, default: false },

    faucetCoins: { type: Number, default: 100 },
    faucetCooldownSec: { type: Number, default: 1800 },

    minCashoutUsd: { type: Number, default: 5 },
    cashoutEnabled: { type: Boolean, default: true },

    streakBaseReward: { type: Number, default: 10 },
    streakEnabled: { type: Boolean, default: true },

    landingHeadline: {
      type: String,
      default: "Get paid for tasks, surveys, and offers.",
    },
    landingSubheadline: {
      type: String,
      default:
        "Collect coins, redeem promo codes, and cash out through PayPal, crypto, and gift cards.",
    },
    landingCta: { type: String, default: "Sign Up Free" },

    leaderboardEnabled: { type: Boolean, default: true },
    leaderboardTitle: {
      type: String,
      default: "Weekly top earners",
    },
    leaderboardLimit: { type: Number, default: 20 },
    offerwallSecret: { type: String, default: "" },
    lastPrizePayoutAt: { type: Date, default: null },

    rankPrizes: {
      type: [
        {
          place: Number,
          coins: Number,
          label: String,
        },
      ],
      default: [
        { place: 1, coins: 5000, label: "1st place" },
        { place: 2, coins: 2500, label: "2nd place" },
        { place: 3, coins: 1000, label: "3rd place" },
        { place: 4, coins: 500, label: "4th place" },
        { place: 5, coins: 250, label: "5th place" },
      ],
    },

    offers: { type: [Schema.Types.Mixed], default: [] } as never,
    offerWalls: { type: [Schema.Types.Mixed], default: [] } as never,
    surveys: { type: [Schema.Types.Mixed], default: [] } as never,
  },
  { timestamps: { createdAt: false, updatedAt: true }, strict: false },
);

export const SiteSettings =
  models.SiteSettings ||
  model<SiteSettingsDocument>("SiteSettings", SiteSettingsSchema);

export async function getSiteSettings(): Promise<SiteSettingsDocument> {
  const existing = await SiteSettings.findById(SETTINGS_ID).lean();
  if (existing) return existing as SiteSettingsDocument;

  const created = await SiteSettings.create({ _id: SETTINGS_ID });
  return created.toObject() as SiteSettingsDocument;
}

export async function updateSiteSettings(
  patch: Partial<SiteSettingsDocument>,
): Promise<SiteSettingsDocument> {
  const updated = await SiteSettings.findByIdAndUpdate(
    SETTINGS_ID,
    { $set: patch },
    { upsert: true, new: true },
  ).lean();
  return updated as SiteSettingsDocument;
}
