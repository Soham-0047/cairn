import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().default(4001),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  LOG_LEVEL: z.string().default("info"),

  FRONTEND_URL: z.string().url().default("http://localhost:3001"),
  BACKEND_PUBLIC_URL: z.string().url().default("http://localhost:4001"),

  MONGODB_URI: z.string().min(1),

  // AES-256-GCM key derivation source. Same shape as gamma's JWT_SECRET, but
  // owned by this service so credentials survive consumer-project rotations.
  SECRET_KEY: z.string().min(16),

  SESSION_SECRET: z.string().min(16),
  SESSION_HOURS: z.coerce.number().int().min(1).max(720).default(168),

  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  ADMIN_EMAILS: z
    .string()
    .min(1)
    .transform((s) =>
      s
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    ),

  // Bearer token for consumer-project read access to /public/*.
  SERVICE_TOKEN: z.string().min(16),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid env for admin-service:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
