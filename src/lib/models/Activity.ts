import mongoose, { Schema, models, model } from "mongoose";

export type ActivityDocument = {
  _id: mongoose.Types.ObjectId;
  type: "earn" | "cashout";
  user: string;
  amount: string;
  source: string;
  userId?: mongoose.Types.ObjectId;
  createdAt: Date;
};

const ActivitySchema = new Schema<ActivityDocument>(
  {
    type: { type: String, enum: ["earn", "cashout"], required: true },
    user: { type: String, required: true },
    amount: { type: String, required: true },
    source: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

ActivitySchema.index({ createdAt: -1 });
ActivitySchema.index({ userId: 1, createdAt: -1 });
ActivitySchema.index({ userId: 1, type: 1, createdAt: -1 });

export const Activity =
  models.Activity || model<ActivityDocument>("Activity", ActivitySchema);
