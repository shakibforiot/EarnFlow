import mongoose, { Schema, models, model } from "mongoose";

export type RedeemCodeDocument = {
  _id: mongoose.Types.ObjectId;
  code: string;
  coins: number;
  maxUses: number;
  usedCount: number;
  active: boolean;
  redeemedBy: mongoose.Types.ObjectId[];
  expiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const RedeemCodeSchema = new Schema<RedeemCodeDocument>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    coins: { type: Number, required: true, min: 1 },
    maxUses: { type: Number, default: 0 }, // 0 = unlimited
    usedCount: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    redeemedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const RedeemCode =
  models.RedeemCode ||
  model<RedeemCodeDocument>("RedeemCode", RedeemCodeSchema);
