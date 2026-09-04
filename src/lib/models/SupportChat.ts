import mongoose, { Schema, models, model } from "mongoose";

export type ChatRole = "user" | "bot" | "admin" | "system";

export type SupportMessage = {
  id: string;
  role: ChatRole;
  text: string;
  createdAt: Date;
};

export type SupportChatDocument = {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  userName: string;
  userEmail: string;
  status: "open" | "waiting_admin" | "admin_active" | "closed";
  botEnabled: boolean;
  unreadAdmin: number;
  unreadUser: number;
  lastMessageAt: Date;
  messages: SupportMessage[];
  createdAt: Date;
  updatedAt: Date;
};

const MessageSchema = new Schema<SupportMessage>(
  {
    id: { type: String, required: true },
    role: {
      type: String,
      enum: ["user", "bot", "admin", "system"],
      required: true,
    },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const SupportChatSchema = new Schema<SupportChatDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    userName: { type: String, default: "" },
    userEmail: { type: String, default: "" },
    status: {
      type: String,
      enum: ["open", "waiting_admin", "admin_active", "closed"],
      default: "open",
      index: true,
    },
    botEnabled: { type: Boolean, default: true },
    unreadAdmin: { type: Number, default: 0 },
    unreadUser: { type: Number, default: 0 },
    lastMessageAt: { type: Date, default: Date.now, index: true },
    messages: { type: [MessageSchema], default: [] },
  },
  { timestamps: true },
);

SupportChatSchema.index({ userId: 1, status: 1 });
SupportChatSchema.index({ lastMessageAt: -1 });

export const SupportChat =
  models.SupportChat ||
  model<SupportChatDocument>("SupportChat", SupportChatSchema);

export function newMessageId() {
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
