import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

// Admin session JWT — signed with SESSION_SECRET, set as an httpOnly cookie
// after a successful Google OAuth callback. The browser sends it on every
// request to /admin/*; backend verifies + reads { email, name } off it.

export type AdminSession = {
  sub: string;       // Google subject id
  email: string;
  name?: string;
  picture?: string;
};

const COOKIE = "admin_session";

export function signSession(payload: AdminSession): string {
  return jwt.sign(payload, env.SESSION_SECRET, {
    issuer: "admin-service",
    expiresIn: `${env.SESSION_HOURS}h`,
  });
}

export function verifySession(token: string): AdminSession | null {
  try {
    const decoded = jwt.verify(token, env.SESSION_SECRET, { issuer: "admin-service" });
    if (typeof decoded === "string") return null;
    const { sub, email, name, picture } = decoded as Record<string, unknown>;
    if (typeof sub !== "string" || typeof email !== "string") return null;
    return {
      sub,
      email,
      name: typeof name === "string" ? name : undefined,
      picture: typeof picture === "string" ? picture : undefined,
    };
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = COOKIE;

export const cookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.NODE_ENV === "production",
  maxAge: env.SESSION_HOURS * 60 * 60 * 1000,
  path: "/",
});
