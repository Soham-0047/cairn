import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

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
  if (!token || token !== env.ADMIN_SECRET) {
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
