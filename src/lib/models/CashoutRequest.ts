import mongoose, { Schema, models, model } from "mongoose";

export type CashoutStatus = "pending" | "approved" | "rejected";

export type CashoutRequestDocument = {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  method: string;
  methodName: string;
  amountUsd: number;
  coins: number;
  status: CashoutStatus;
  giftCode?: string | null;
  adminNote?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const CashoutRequestSchema = new Schema<CashoutRequestDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    method: { type: String, required: true },
    methodName: { type: String, required: true },
    amountUsd: { type: Number, required: true, min: 0 },
    coins: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    giftCode: { type: String, default: null },
    adminNote: { type: String, default: null },
  },
  { timestamps: true },
);

CashoutRequestSchema.index({ userId: 1, createdAt: -1 });

export const CashoutRequest =
  models.CashoutRequest ||
  model<CashoutRequestDocument>("CashoutRequest", CashoutRequestSchema);
