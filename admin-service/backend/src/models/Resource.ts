import { Schema, model, InferSchemaType, Types } from "mongoose";

const resourceSchema = new Schema(
  {
    url: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    type: { type: String, enum: ["video", "article", "course", "book", "doc"], required: true },
    source: { type: String, default: "" },
    durationMin: { type: Number, default: 0 },
    topics: { type: [String], default: [], index: true },
    language: { type: String, default: "en" },
    qualityScore: { type: Number, default: 0.7 },
    description: { type: String, default: "" },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true },
);

resourceSchema.index({ topics: 1, qualityScore: -1 });

export type ResourceDoc = InferSchemaType<typeof resourceSchema> & { _id: Types.ObjectId };

export const Resource = model("Resource", resourceSchema);
