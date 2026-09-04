import mongoose, { Schema, models, model } from "mongoose";

export type OfferCompletionDocument = {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  offerId: string;
  coins: number;
  createdAt: Date;
  updatedAt: Date;
};

const OfferCompletionSchema = new Schema<OfferCompletionDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    offerId: { type: String, required: true, index: true },
    coins: { type: Number, required: true },
  },
  { timestamps: true },
);

OfferCompletionSchema.index({ userId: 1, offerId: 1 }, { unique: true });

export const OfferCompletion =
  models.OfferCompletion ||
  model<OfferCompletionDocument>("OfferCompletion", OfferCompletionSchema);
