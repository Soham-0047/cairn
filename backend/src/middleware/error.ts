import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger.js";

const isDev = process.env.NODE_ENV === "development";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  // In production omit the stack from structured logs to avoid leaking
  // internals into downstream log aggregators / metrics surfaces; the
  // name+message are still enough to identify the failure mode.
  const payload = isDev
    ? { err, path: req.path, method: req.method }
    : {
        path: req.path,
        method: req.method,
        err: {
          name: err?.name,
          message: err?.message,
        },
      };
  logger.error(payload, "Unhandled error");
  if (res.headersSent) return;
  res.status(500).json({
    error: "Internal server error",
    message: isDev ? err.message : undefined,
  });
}
