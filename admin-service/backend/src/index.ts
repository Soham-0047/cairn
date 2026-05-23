import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { logger } from "./utils/logger.js";
import { errorHandler } from "./middleware/error.js";

import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin/index.js";
import publicRoutes from "./routes/public/index.js";

async function main() {
  await connectDB();

  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "2mb" }));
  app.use(cookieParser());
  app.use(morgan("tiny"));

  const generalLimiter = rateLimit({
    windowMs: 60_000,
    max: 240,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(generalLimiter);

  app.get("/health", (_req, res) => res.json({ ok: true, service: "admin-service", env: env.NODE_ENV }));

  app.use("/auth", authRoutes);
  app.use("/admin", adminRoutes);
  app.use("/public", publicRoutes);

  app.use(errorHandler);

  app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, "admin-service listening");
  });
}

main().catch((err) => {
  logger.fatal({ err }, "admin-service failed to start");
  process.exit(1);
});
