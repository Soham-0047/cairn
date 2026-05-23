import { Request, Response, NextFunction } from "express";
import { env } from "../config/env.js";
import { AdminSession, verifySession, SESSION_COOKIE } from "../auth/session.js";

export interface AuthedRequest extends Request {
  admin?: AdminSession;
  isService?: boolean;
}

// Browser session — required for admin UI mutations.
export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  const cookieToken = req.cookies?.[SESSION_COOKIE];
  if (!cookieToken) return res.status(401).json({ error: "Not authenticated" });
  const session = verifySession(cookieToken);
  if (!session) return res.status(401).json({ error: "Session expired" });
  if (!env.ADMIN_EMAILS.includes(session.email.toLowerCase())) {
    return res.status(403).json({ error: "Email not authorized" });
  }
  req.admin = session;
  next();
}

// Service token — used by consumer projects calling /public/*.
// Constant-time compare to avoid timing leaks on the secret.
export function requireServiceToken(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing service token" });
  }
  const provided = header.slice(7);
  if (!timingSafeEq(provided, env.SERVICE_TOKEN)) {
    return res.status(401).json({ error: "Invalid service token" });
  }
  req.isService = true;
  next();
}

function timingSafeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
