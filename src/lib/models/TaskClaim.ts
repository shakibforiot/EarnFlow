import mongoose, { Schema, models, model } from "mongoose";

export type TaskClaimDocument = {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  taskId: string;
  dayKey: string;
  coins: number;
  createdAt: Date;
  updatedAt: Date;
};

const TaskClaimSchema = new Schema<TaskClaimDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    taskId: { type: String, required: true },
    dayKey: { type: String, required: true, index: true },
    coins: { type: Number, required: true },
  },
  { timestamps: true },
);

TaskClaimSchema.index({ userId: 1, taskId: 1, dayKey: 1 }, { unique: true });

export const TaskClaim =
  models.TaskClaim || model<TaskClaimDocument>("TaskClaim", TaskClaimSchema);

export function utcDayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}
