import { Schema, model, InferSchemaType, Types } from "mongoose";

const progressLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    pathId: { type: Schema.Types.ObjectId, ref: "Path", index: true },
    type: {
      type: String,
      enum: [
        "resource_completed",
        "milestone_completed",
        "quiz_attempted",
        "project_submitted",
        "credential_issued",
        "replan_triggered",
        "streak_extended",
      ],
      required: true,
    },
    payload: { type: Schema.Types.Mixed, default: {} },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false },
);

export type ProgressLogDoc = InferSchemaType<typeof progressLogSchema> & { _id: Types.ObjectId };

export const ProgressLog = model("ProgressLog", progressLogSchema);
