import mongoose, { Schema, models, model } from "mongoose";

export type ContactMessageDocument = {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  subject: string;
  message: string;
  userId?: mongoose.Types.ObjectId;
  status: "new" | "read" | "replied";
  createdAt: Date;
};

const ContactMessageSchema = new Schema<ContactMessageDocument>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    status: {
      type: String,
      enum: ["new", "read", "replied"],
      default: "new",
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

ContactMessageSchema.index({ createdAt: -1 });

export const ContactMessage =
  models.ContactMessage ||
  model<ContactMessageDocument>("ContactMessage", ContactMessageSchema);
