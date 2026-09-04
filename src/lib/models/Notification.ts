import mongoose, { Schema, models, model } from "mongoose";

export type NotificationDocument = {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: string;
  title: string;
  body: string;
  href?: string;
  read: boolean;
  createdAt: Date;
};

const NotificationSchema = new Schema<NotificationDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    href: { type: String, default: "" },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

NotificationSchema.index({ userId: 1, createdAt: -1 });

export const Notification =
  models.Notification ||
  model<NotificationDocument>("Notification", NotificationSchema);
