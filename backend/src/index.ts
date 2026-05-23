import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { logger } from "./utils/logger.js";
import { errorHandler } from "./middleware/error.js";

import authRoutes from "./routes/auth.js";
import pathsRoutes from "./routes/paths.js";
import evalRoutes from "./routes/evaluations.js";
import portfolioRoutes from "./routes/portfolio.js";
import configRoutes from "./routes/config.js";
import adminRoutes from "./routes/admin/index.js";
import transcriptionRoutes from "./routes/transcription.js";
import { seedEnvCredentials } from "./llm/providers/registry.js";
import { getCredentialStore } from "./llm/credentialStore.js";
import { startWeeklyNudgeJob } from "./jobs/weekly-nudge.js";
import { isEnabled as adminServiceEnabled, ping as adminServicePing } from "./services/admin-client.js";

async function main() {
  await connectDB();

  if (adminServiceEnabled()) {
    // Credentials live in the central admin-service. Skip the local-Mongo env
    // seed and just probe that the service is reachable — the credential store
    // will pull keys over HTTP on its first reload.
    const probe = await adminServicePing();
    if (probe.ok) {
      logger.info("admin-service reachable; credentials will be sourced remotely");
    } else {
      logger.warn(
        { detail: probe.detail },
        "admin-service NOT reachable — credentials will be empty until it comes online",
      );
    }
  } else {
    // Legacy path: migrate env-vars into the local encrypted vault.
    await seedEnvCredentials();
  }
  await getCredentialStore().reload();

  // When the admin-service is the source of truth, refresh on a timer so
  // rotations / new keys propagate without a gamma redeploy. TTL matches the
  // admin-client's local cache TTL — no point pulling more often.
  if (adminServiceEnabled()) {
    const everyMs = env.ADMIN_SERVICE_TTL_SEC * 1000;
    setInterval(() => {
      getCredentialStore().reload().catch(() => {});
    }, everyMs).unref();
  }

  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
    }),
  );
  // 20MB allows screenshot uploads (4 images × ~5MB base64).
  app.use(express.json({ limit: "20mb" }));
  app.use(morgan("tiny"));

  const generalLimiter = rateLimit({
    windowMs: 60_000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use("/api", generalLimiter);

  // Health
  app.get("/health", (_req, res) => res.json({ ok: true, env: env.NODE_ENV }));

  // Public read of site config — heavy frontend use; tighter limit
  app.use("/api/config", configRoutes);

  // Auth
  app.use("/api/auth", authRoutes);

  // Authed user APIs
  app.use("/api/paths", pathsRoutes);
  app.use("/api/evaluations", evalRoutes);
  app.use("/api", transcriptionRoutes);

  // Public portfolio (no auth)
  app.use("/api/portfolio", portfolioRoutes);

  // Admin (token-gated)
  app.use("/api/admin", adminRoutes);

  app.use(errorHandler);

  app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, "🚀 Cairn backend listening");
  });

  startWeeklyNudgeJob();
}

main().catch((err) => {
  logger.fatal({ err }, "Backend failed to start");
  process.exit(1);
});
