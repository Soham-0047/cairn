import { Schema, model, InferSchemaType, Types } from "mongoose";

// Generic API-credential vault. One row per (service, account). Plaintext
// secrets are never stored — see utils/crypto.ts for encryption.

const apiCredentialSchema = new Schema(
  {
    service: { type: String, required: true, index: true, trim: true, lowercase: true },
    kind: {
      type: String,
      enum: ["llm", "image", "content", "embedding", "oauth", "storage", "other"],
      default: "llm",
      index: true,
    },
    label: { type: String, required: true, trim: true },

    secret: {
      ciphertext: { type: String, required: true },
      iv: { type: String, required: true },
      authTag: { type: String, required: true },
    },
    keyHint: { type: String, default: "" },
    metadata: { type: Schema.Types.Mixed, default: {} },

    priority: { type: Number, default: 100, index: true },
    enabled: { type: Boolean, default: true, index: true },

    lastUsedAt: { type: Date },
    lastFailureAt: { type: Date },
    lastFailureReason: { type: String, default: "" },
    failureCount: { type: Number, default: 0 },
    successCount: { type: Number, default: 0 },

    source: {
      type: String,
      enum: ["env", "admin", "import"],
      default: "admin",
      index: true,
    },
  },
  { timestamps: true },
);

apiCredentialSchema.index({ service: 1, enabled: 1, priority: 1 });

export type ApiCredentialDoc = InferSchemaType<typeof apiCredentialSchema> & {
  _id: Types.ObjectId;
};

export const ApiCredential = model<ApiCredentialDoc>("ApiCredential", apiCredentialSchema);
