import { Schema, model, InferSchemaType, Types } from "mongoose";

/**
 * Generic API-credential vault. Built to outlive this specific project — any
 * future project can reuse this model + the admin UI to manage:
 *   - LLM provider keys (Google AI, OpenRouter, Groq, OpenAI, Anthropic, ...)
 *   - Content APIs (Unsplash, Pexels, Pixabay, Imgur)
 *   - OAuth client secrets (GitHub apps, Google clients)
 *   - Anything that's a "service + secret" pair
 *
 * Multi-account: storing N rows with the same `service` and different `label`
 * gives you N accounts for that service (e.g., two Gmail accounts → two Gemini
 * API keys). The credential store picks the highest-priority enabled key and
 * rotates on rate-limit/auth failures.
 *
 * Secret material is AES-256-GCM encrypted (see utils/crypto.ts). The plaintext
 * never leaves this server's memory after decryption.
 */
const apiCredentialSchema = new Schema(
  {
    /** Service identifier — matches Provider.name for LLM providers, or any
     *  freeform string for other API categories. */
    service: { type: String, required: true, index: true, trim: true, lowercase: true },

    /** Broad category — lets the admin UI group/filter sensibly. */
    kind: {
      type: String,
      enum: ["llm", "image", "content", "embedding", "oauth", "storage", "other"],
      default: "llm",
      index: true,
    },

    /** Human label — e.g. "Personal Gmail", "Work account", "Team shared". */
    label: { type: String, required: true, trim: true },

    /** Encrypted secret material. Use utils/crypto.ts to read/write. */
    secret: {
      ciphertext: { type: String, required: true },
      iv: { type: String, required: true },
      authTag: { type: String, required: true },
    },

    /** Last 4 chars of plaintext key — for display/identification in UI. */
    keyHint: { type: String, default: "" },

    /** Free-form metadata. Examples:
     *  - LLM: { baseURL: "...", organization: "..." }
     *  - OAuth: { clientId: "...", scopes: [...] }
     *  - Image: { dailyQuota: 50, sizeLimitMB: 5 }
     */
    metadata: { type: Schema.Types.Mixed, default: {} },

    /** Lower number = higher priority. Default 100 lets you slot env-seeded
     *  keys at 1000 and user-added keys above them naturally. */
    priority: { type: Number, default: 100, index: true },

    enabled: { type: Boolean, default: true, index: true },

    /** Operational telemetry — populated by the credential store. */
    lastUsedAt: { type: Date },
    lastFailureAt: { type: Date },
    lastFailureReason: { type: String, default: "" },
    failureCount: { type: Number, default: 0 },
    successCount: { type: Number, default: 0 },

    /** Where this credential came from. Lets us refresh env-seeded rows
     *  without obliterating user-added ones. */
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
