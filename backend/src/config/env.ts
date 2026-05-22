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
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
