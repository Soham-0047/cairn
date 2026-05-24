import { Schema, model, InferSchemaType, Types } from "mongoose";

const questionSchema = new Schema(
  {
    q: { type: String, required: true },
    choices: { type: [String], required: true },
    answerIndex: { type: Number, required: true },
    explanation: { type: String, default: "" },
  },
  { _id: false },
);

const attemptSchema = new Schema(
  {
    answers: { type: [Number], required: true },
    correct: { type: Number, required: true },
    total: { type: Number, required: true },
    score: { type: Number, required: true },
    attemptedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const quizSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    topic: { type: String, required: true },
    level: { type: Number, min: 1, max: 5, default: 3 },
    pathId: { type: Schema.Types.ObjectId, ref: "Path" },
    /** Coordinates inside the path for milestone-linked quizzes. */
    phaseIndex: { type: Number },
    milestoneIndex: { type: Number },
    questions: { type: [questionSchema], default: [] },
    attempts: { type: [attemptSchema], default: [] },
    bestScore: { type: Number, default: 0 },
    /** Telemetry — which model produced the questions. */
    generatedBy: {
      provider: { type: String, default: "" },
      model: { type: String, default: "" },
    },
  },
  { timestamps: true },
);

quizSchema.index({ userId: 1, topic: 1, createdAt: -1 });

export type QuizDoc = InferSchemaType<typeof quizSchema> & { _id: Types.ObjectId };

export const Quiz = model("Quiz", quizSchema);
