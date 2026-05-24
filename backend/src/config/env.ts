import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  LOG_LEVEL: z.string().default("info"),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),

  MONGODB_URI: z.string().min(1),

  JWT_SECRET: z.string().min(16),
  JWT_ISSUER: z.string().default("cairn"),

  ADMIN_SECRET: z.string().min(16),

  GITHUB_TOKEN_FOR_PUBLIC_READS: z.string().optional().default(""),

  // LLM providers — all optional; router skips missing keys
  GOOGLE_AI_API_KEY: z.string().optional().default(""),
  OPENROUTER_API_KEY: z.string().optional().default(""),
  GROQ_API_KEY: z.string().optional().default(""),
  CEREBRAS_API_KEY: z.string().optional().default(""),
  TOGETHER_API_KEY: z.string().optional().default(""),
  HF_API_KEY: z.string().optional().default(""),

  // Resource search — Exa.ai (primary), Tavily (fallback). Both optional.
  EXA_API_KEY: z.string().optional().default(""),
  EXA_FALLBACK_TAVILY_KEY: z.string().optional().default(""),

  // Qdrant vector store — for "similar past learners" recall during path generation.
  QDRANT_URL: z.string().optional().default(""),
  QDRANT_API_KEY: z.string().optional().default(""),
  QDRANT_COLLECTION: z.string().optional().default("cairn_paths"),

  // Resend — transactional email. Optional; missing key degrades to no-op.
  RESEND_API_KEY: z.string().optional().default(""),
  FROM_EMAIL: z.string().optional().default("onboarding@resend.dev"),

  // External admin-service (centralized credential vault). When enabled, the
  // credential store and site config are sourced from this service instead of
  // the local Mongo collections. Local /api/admin/* routes still work as a
  // fallback so dev keeps going if the admin-service is offline.
  ADMIN_SERVICE_ENABLED: z
    .union([z.string(), z.boolean()])
    .optional()
    .transform((v) => v === true || v === "true" || v === "1"),
  ADMIN_SERVICE_URL: z
    .union([z.string().url(), z.literal("")])
    .optional()
    .default(""),
  ADMIN_SERVICE_TOKEN: z.string().optional().default(""),
  ADMIN_SERVICE_PRODUCT_KEY: z.string().optional().default("default"),
  ADMIN_SERVICE_TTL_SEC: z.coerce.number().int().min(5).max(3600).default(60),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
