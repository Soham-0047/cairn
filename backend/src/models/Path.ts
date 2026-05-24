import { Schema, model, InferSchemaType, Types } from "mongoose";

const resourceRefSchema = new Schema(
  {
    title: { type: String, required: true },
    url: { type: String, required: true },
    type: { type: String, enum: ["video", "article", "course", "book", "doc"], required: true },
    expectedMinutes: { type: Number, default: 30 },
    status: {
      type: String,
      enum: ["pending", "in_progress", "done", "skipped"],
      default: "pending",
    },
    /** Where this resource came from — used to badge "Live" results on the dashboard. */
    source: {
      type: String,
      enum: ["exa", "tavily", "corpus", "llm"],
      default: "llm",
    },
    summary: { type: String, default: "" },
    publishedDate: { type: String, default: "" },
  },
  { _id: false },
);

const milestoneSchema = new Schema(
  {
    week: { type: Number, required: true },
    topic: { type: String, required: true },
    summary: { type: String, default: "" },
    resources: { type: [resourceRefSchema], default: [] },
    deliverable: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "in_progress", "done"],
      default: "pending",
    },
  },
  { _id: false },
);

const projectSpecSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" },
    expectedHours: { type: Number, default: 10 },
    skills: { type: [String], default: [] },
    isNorthStar: { type: Boolean, default: false },
  },
  { _id: false },
);

const phaseSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    weeks: { type: [Number], default: [] },
    milestones: { type: [milestoneSchema], default: [] },
    projects: { type: [projectSpecSchema], default: [] },
  },
  { _id: false },
);

const pathSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: {
      type: String,
      enum: ["active", "completed", "abandoned"],
      default: "active",
      index: true,
    },
    goal: { type: String, required: true },
    targetRole: { type: String, default: "" },
    timelineWeeks: { type: Number, default: 12 },
    summary: { type: String, default: "" },
    stretchGoalWarning: { type: String, default: "" },
    phases: { type: [phaseSchema], default: [] },
    /** Telemetry — which Gemma 4 variant generated this path. */
    generatedBy: {
      provider: { type: String, default: "" },
      model: { type: String, default: "" },
    },
    lastReplanedAt: { type: Date },
  },
  { timestamps: true },
);

// `GET /api/paths/active` and the guest-limit count both query by
// (userId, status) — a compound index serves both without scanning.
pathSchema.index({ userId: 1, status: 1, createdAt: -1 });

export type PathDoc = InferSchemaType<typeof pathSchema> & { _id: Types.ObjectId };

export const Path = model("Path", pathSchema);
