import { Schema, model, InferSchemaType, Types } from "mongoose";

const stageResultSchema = new Schema(
  {
    name: { type: String, required: true },
    score: { type: Number, min: 0, max: 1, required: true },
    summary: { type: String, default: "" },
    findings: { type: [String], default: [] },
  },
  { _id: false },
);

const screenshotSchema = new Schema(
  {
    label: { type: String, default: "" },
    /** Stored as data: URL or external URL. Hackathon: data URL is fine. */
    dataUrl: { type: String, required: true },
    /** What the multimodal model said about this image. */
    visualFindings: { type: String, default: "" },
  },
  { _id: false },
);

const evaluationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    repoUrl: { type: String, required: true },
    repoOwner: { type: String, default: "" },
    repoName: { type: String, default: "" },
    projectTitle: { type: String, default: "" },
    projectType: { type: String, default: "general" },
    claimedSkills: { type: [String], default: [] },

    stages: { type: [stageResultSchema], default: [] },
    /** Multimodal: optional screenshots the user uploaded. */
    screenshots: { type: [screenshotSchema], default: [] },

    finalScore: { type: Number, min: 0, max: 1, default: 0 },
    passed: { type: Boolean, default: false },
    feedback: { type: String, default: "" },
    strengths: { type: [String], default: [] },
    improvements: { type: [String], default: [] },

    /** Which models ran each stage — for transparency in the demo. */
    modelsUsed: {
      type: [
        new Schema(
          { stage: String, provider: String, model: String, latencyMs: Number },
          { _id: false },
        ),
      ],
      default: [],
    },

    status: {
      type: String,
      enum: ["queued", "running", "complete", "failed"],
      default: "queued",
      index: true,
    },
    error: { type: String, default: "" },
  },
  { timestamps: true },
);

export type EvaluationDoc = InferSchemaType<typeof evaluationSchema> & { _id: Types.ObjectId };

export const Evaluation = model("Evaluation", evaluationSchema);
