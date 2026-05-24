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

    /** Dependency vulnerabilities from Stage 1 (Dependabot via GitHub API). */
    vulnerabilities: {
      type: new Schema(
        {
          available: { type: Boolean, default: false },
          critical: { type: Number, default: 0 },
          high: { type: Number, default: 0 },
          medium: { type: Number, default: 0 },
          low: { type: Number, default: 0 },
          total: { type: Number, default: 0 },
        },
        { _id: false },
      ),
      default: () => ({ available: false, critical: 0, high: 0, medium: 0, low: 0, total: 0 }),
    },

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

    originalityFlagged: { type: Boolean, default: false },

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

// Guest-limit middleware does a daily global count over createdAt — index it
// so that check stays O(log n) once the eval corpus grows.
evaluationSchema.index({ createdAt: -1 });
// User-scoped history listings sort by createdAt; the existing userId index
// plus this compound makes the common dashboard query (`find({ userId }).sort({ createdAt: -1 })`) an index scan instead of an in-memory sort.
evaluationSchema.index({ userId: 1, createdAt: -1 });

export type EvaluationDoc = InferSchemaType<typeof evaluationSchema> & { _id: Types.ObjectId };

export const Evaluation = model("Evaluation", evaluationSchema);
