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

/**
 * One tool call the investigator made. Persisted because "which files did the
 * agent choose to read, and why" is the difference between a review a user can
 * audit and a score they have to take on faith.
 */
const agentStepSchema = new Schema(
  {
    index: { type: Number, required: true },
    thought: { type: String, default: "" },
    tool: { type: String, default: "" },
    args: { type: Schema.Types.Mixed, default: {} },
    observation: { type: String, default: "" },
    isError: { type: Boolean, default: false },
    latencyMs: { type: Number, default: 0 },
    provider: { type: String, default: "" },
    model: { type: String, default: "" },
  },
  { _id: false },
);

/**
 * A claim and what happened when it was checked against the source it cites.
 * Dropped claims are stored alongside surviving ones — showing what the system
 * rejected is the clearest evidence that verification is real.
 */
const claimSchema = new Schema(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
    cite: { type: String, default: "" },
    polarity: { type: String, enum: ["positive", "negative", "neutral"], default: "neutral" },
    source: { type: String, default: "" },
    verdict: {
      type: String,
      enum: ["supported", "unsupported", "contradicted", "uncitable"],
      default: "unsupported",
    },
    reason: { type: String, default: "" },
  },
  { _id: false },
);

/** One weighted input to the final score, with the weight it actually carried. */
const componentSchema = new Schema(
  {
    key: { type: String, required: true },
    label: { type: String, default: "" },
    value: { type: Number, default: 0 },
    weight: { type: Number, default: 0 },
    effectiveWeight: { type: Number, default: 0 },
    confidence: { type: String, default: "" },
    present: { type: Boolean, default: true },
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

    /* ---------------- agentic workflow record ---------------- */

    /** The investigator's trajectory: every tool call, in order. */
    agentSteps: { type: [agentStepSchema], default: [] },
    /** Files the agent chose to open. */
    filesRead: { type: [String], default: [] },
    /** Every claim produced, with its verification verdict. */
    claims: { type: [claimSchema], default: [] },
    /** Share of claims that survived verification, 0-1. */
    groundedness: { type: Number, min: 0, max: 1, default: 0 },
    /** Weighted inputs to the final score. */
    scoreComponents: { type: [componentSchema], default: [] },
    /** How far the score was pulled toward the deterministic anchor, 0-1. */
    shrinkage: { type: Number, min: 0, max: 1, default: 0 },
    /** Why the project did or did not pass, in one sentence. */
    passReason: { type: String, default: "" },
    /** One-line verdict a reviewer could quote. */
    verdictLine: { type: String, default: "" },
    /** Resource cost of the run, for the evaluation harness and the admin view. */
    runCost: {
      type: new Schema(
        {
          llmCalls: { type: Number, default: 0 },
          githubReads: { type: Number, default: 0 },
          agentBudgetUsed: { type: Number, default: 0 },
          totalLatencyMs: { type: Number, default: 0 },
        },
        { _id: false },
      ),
      default: () => ({ llmCalls: 0, githubReads: 0, agentBudgetUsed: 0, totalLatencyMs: 0 }),
    },
    /** Which pipeline produced this record — lets the harness compare them. */
    pipeline: { type: String, enum: ["agent", "baseline"], default: "agent", index: true },

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
