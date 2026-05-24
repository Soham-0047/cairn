import { Schema, model, InferSchemaType, Types } from "mongoose";

const messageSchema = new Schema(
  {
    role: { type: String, enum: ["interviewer", "candidate"], required: true },
    content: { type: String, required: true },
    /** True when this turn came from voice transcription. Surfaces a mic icon
     *  on the transcript so you can spot voice-driven sessions in review. */
    fromVoice: { type: Boolean, default: false },
    ts: { type: Date, default: Date.now },
  },
  { _id: false },
);

const scoreSchema = new Schema(
  {
    overall: { type: Number, default: 0 },
    technical: { type: Number, default: 0 },
    communication: { type: Number, default: 0 },
    problemSolving: { type: Number, default: 0 },
    seniority: { type: String, default: "" },
    strengths: { type: [String], default: [] },
    improvements: { type: [String], default: [] },
    summary: { type: String, default: "" },
    recommendation: {
      type: String,
      enum: ["strong_hire", "hire", "lean_hire", "no_hire", "strong_no_hire", ""],
      default: "",
    },
  },
  { _id: false },
);

const interviewSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    role: { type: String, required: true },
    level: { type: String, enum: ["junior", "mid", "senior"], default: "junior" },
    focus: { type: String, default: "" },
    status: {
      type: String,
      enum: ["active", "complete"],
      default: "active",
      index: true,
    },
    messages: { type: [messageSchema], default: [] },
    score: { type: scoreSchema, default: () => ({}) },
    /** Telemetry — turn and scoring may run on different models. */
    modelsUsed: {
      type: [
        new Schema(
          {
            stage: String,
            provider: String,
            model: String,
            latencyMs: Number,
          },
          { _id: false },
        ),
      ],
      default: [],
    },
  },
  { timestamps: true },
);

interviewSchema.index({ userId: 1, status: 1, createdAt: -1 });

export type InterviewSessionDoc = InferSchemaType<typeof interviewSchema> & { _id: Types.ObjectId };

export const InterviewSession = model("InterviewSession", interviewSchema);
