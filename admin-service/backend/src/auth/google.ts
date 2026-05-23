import crypto from "node:crypto";
import { env } from "../config/env.js";

// Minimal Google OAuth 2.0 flow — no third-party SDK. We only need email +
// name + sub from the id_token, which is a standard OIDC JWT we can decode.

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

export function redirectUri(): string {
  return `${env.BACKEND_PUBLIC_URL.replace(/\/$/, "")}/auth/google/callback`;
}

export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export type GoogleProfile = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
};

export async function exchangeCode(code: string): Promise<GoogleProfile> {
  const body = new URLSearchParams({
    code,
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    redirect_uri: redirectUri(),
    grant_type: "authorization_code",
  });

  const r = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!r.ok) {
    const detail = await r.text().catch(() => "");
    throw new Error(`Google token exchange failed: ${r.status} ${detail.slice(0, 200)}`);
  }
  const json = (await r.json()) as { id_token?: string };
  if (!json.id_token) throw new Error("No id_token in Google response");
  return decodeIdToken(json.id_token);
}

// id_token is a JWT (header.payload.signature). We trust the payload because
// the token came directly from Google over TLS in the code-exchange response —
// no need to verify the signature ourselves.
function decodeIdToken(jwt: string): GoogleProfile {
  const parts = jwt.split(".");
  if (parts.length !== 3 || !parts[1]) throw new Error("Malformed id_token");
  const payloadJson = Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
  const p = JSON.parse(payloadJson) as Record<string, unknown>;
  if (typeof p.sub !== "string" || typeof p.email !== "string") {
    throw new Error("Google id_token missing sub/email");
  }
  return {
    sub: p.sub,
    email: p.email.toLowerCase(),
    emailVerified: p.email_verified === true,
    name: typeof p.name === "string" ? p.name : undefined,
    picture: typeof p.picture === "string" ? p.picture : undefined,
  };
}

// Used as the OAuth `state` param to prevent CSRF on the callback.
export function randomState(): string {
  return crypto.randomBytes(24).toString("base64url");
}
