import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env.js";

/** Constant-time string compare to avoid leaking secrets via timing side-channel. */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    // Still run the compare on equal-length buffers so wrong-length probes
    // can't be distinguished from wrong-value probes by timing.
    crypto.timingSafeEqual(ab, ab);
    return false;
  }
  return crypto.timingSafeEqual(ab, bb);
}

export interface AuthedRequest extends Request {
  userId?: string;
  isAdmin?: boolean;
}

/**
 * Verifies the JWT minted by the frontend after NextAuth flow.
 * Frontend sends `Authorization: Bearer <jwt>` on authenticated calls.
 */
export function requireUser(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing bearer token" });
  }
  try {
    const payload = jwt.verify(header.slice(7), env.JWT_SECRET, {
      issuer: env.JWT_ISSUER,
    }) as { sub?: string };
    if (!payload.sub) throw new Error("no sub");
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

/**
 * Admin token gate. Header: `X-Admin-Token: <ADMIN_SECRET>`.
 * Simplest possible auth that's not embarrassing in prod for a solo founder.
 */
export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = req.header("x-admin-token");
  if (!token || !env.ADMIN_SECRET || !safeEqual(token, env.ADMIN_SECRET)) {
    return res.status(401).json({ error: "Admin token required" });
  }
  req.isAdmin = true;
  next();
}

/** Optional auth — sets userId if present but does not require it. */
export function optionalUser(req: AuthedRequest, _res: Response, next: NextFunction) {
  const header = req.header("authorization");
  if (header?.startsWith("Bearer ")) {
    try {
      const payload = jwt.verify(header.slice(7), env.JWT_SECRET, {
        issuer: env.JWT_ISSUER,
      }) as { sub?: string };
      if (payload.sub) req.userId = payload.sub;
    } catch {
      // ignore
    }
  }
  next();
}
