import { Router } from "express";
import { env } from "../config/env.js";
import { buildAuthUrl, exchangeCode, randomState } from "../auth/google.js";
import { signSession, verifySession, SESSION_COOKIE, cookieOptions } from "../auth/session.js";
import { logger } from "../utils/logger.js";

const router = Router();

// Short-lived in-process state cache for CSRF protection on the OAuth callback.
// 5-minute TTL is enough for any reasonable consent flow.
const stateCache = new Map<string, number>();
const STATE_TTL_MS = 5 * 60 * 1000;

function gcStates() {
  const now = Date.now();
  for (const [s, exp] of stateCache) if (exp < now) stateCache.delete(s);
}

router.get("/google/start", (_req, res) => {
  gcStates();
  const state = randomState();
  stateCache.set(state, Date.now() + STATE_TTL_MS);
  res.redirect(buildAuthUrl(state));
});

router.get("/google/callback", async (req, res) => {
  const { code, state, error } = req.query as Record<string, string | undefined>;
  if (error) return res.redirect(`${env.FRONTEND_URL}/login?error=${encodeURIComponent(error)}`);
  if (!code || !state) return res.redirect(`${env.FRONTEND_URL}/login?error=missing_code`);

  const exp = stateCache.get(state);
  if (!exp || exp < Date.now()) {
    return res.redirect(`${env.FRONTEND_URL}/login?error=invalid_state`);
  }
  stateCache.delete(state);

  try {
    const profile = await exchangeCode(code);
    if (!profile.emailVerified) {
      return res.redirect(`${env.FRONTEND_URL}/login?error=email_unverified`);
    }
    if (!env.ADMIN_EMAILS.includes(profile.email)) {
      logger.warn({ email: profile.email }, "Login attempt from non-allowed email");
      return res.redirect(`${env.FRONTEND_URL}/login?error=not_authorized`);
    }
    const token = signSession({
      sub: profile.sub,
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
    });
    res.cookie(SESSION_COOKIE, token, cookieOptions());
    res.redirect(env.FRONTEND_URL);
  } catch (err) {
    logger.error({ err }, "OAuth callback failed");
    res.redirect(`${env.FRONTEND_URL}/login?error=oauth_failed`);
  }
});

router.get("/me", (req, res) => {
  const cookieToken = req.cookies?.[SESSION_COOKIE];
  if (!cookieToken) return res.json({ authenticated: false });
  const session = verifySession(cookieToken);
  if (!session) return res.json({ authenticated: false });
  if (!env.ADMIN_EMAILS.includes(session.email.toLowerCase())) {
    return res.json({ authenticated: false, reason: "not_authorized" });
  }
  res.json({ authenticated: true, admin: session });
});

router.post("/logout", (_req, res) => {
  res.clearCookie(SESSION_COOKIE, { path: "/" });
  res.json({ ok: true });
});

export default router;
