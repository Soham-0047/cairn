import mongoose, { Schema, model, InferSchemaType, Types, Model } from "mongoose";
import crypto from "node:crypto";
import { env } from "../config/env.js";

interface CredentialStatics extends Model<CredentialDoc> {
  signPayload(payload: {
    userId: string;
    type: string;
    title: string;
    issuedAt: Date;
  }): string;
}

const credentialSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: ["project", "quiz_mastery", "milestone"],
      required: true,
    },
    title: { type: String, required: true },
    skills: { type: [String], default: [] },
    evidence: {
      repoUrl: { type: String, default: "" },
      evaluationId: { type: Schema.Types.ObjectId, ref: "Evaluation" },
      score: { type: Number, default: 0 },
    },
    issuedAt: { type: Date, default: Date.now },
    signature: { type: String, required: true },
  },
  { timestamps: true },
);

credentialSchema.statics.signPayload = function (payload: {
  userId: string;
  type: string;
  title: string;
  issuedAt: Date;
}): string {
  const hmac = crypto.createHmac("sha256", env.JWT_SECRET);
  hmac.update(
    `${payload.userId}|${payload.type}|${payload.title}|${payload.issuedAt.toISOString()}`,
  );
  return hmac.digest("hex");
};

export type CredentialDoc = InferSchemaType<typeof credentialSchema> & { _id: Types.ObjectId };

export const Credential = model<CredentialDoc, CredentialStatics>("Credential", credentialSchema);
