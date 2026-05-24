import { Response, NextFunction } from "express";
import { User } from "../models/User.js";
import { Path } from "../models/Path.js";
import { Evaluation } from "../models/Evaluation.js";
import { getOrCreateSiteConfig } from "../models/SiteConfig.js";
import type { AuthedRequest } from "./auth.js";

type LimitType = "path" | "evaluation";

/**
 * Enforces per-guest and global guest limits configured in SiteConfig.
 * No-op for non-guest users — they're rate-limited by the regular express limiter.
 *
 * Why admin-controlled: judges' free traffic to free LLM tiers, we don't want
 * one viral tweet to burn a Google AI Studio quota. Admin can tighten in real-time.
 */
export function checkGuestLimit(type: LimitType) {
  return async function (req: AuthedRequest, res: Response, next: NextFunction) {
    if (!req.userId) return next();
    // User and SiteConfig are independent — fetch in parallel to cut one
    // round-trip off the hot path for every guest request.
    const [user, cfg] = await Promise.all([
      User.findById(req.userId).select("isGuest guestExpiresAt").lean(),
      getOrCreateSiteConfig(),
    ]);
    if (!user) return res.status(401).json({ error: "User not found" });
    if (!user.isGuest) return next();

    // Guest expiry check
    if (user.guestExpiresAt && user.guestExpiresAt < new Date()) {
      return res.status(403).json({
        error: "Guest session expired. Sign in with GitHub to continue.",
        code: "guest_expired",
      });
    }

    const guest = cfg.guestMode;

    if (!guest.enabled) {
      return res.status(403).json({
        error: "Guest mode is currently disabled. Sign in with GitHub.",
        code: "guest_disabled",
      });
    }

    if (type === "path") {
      const count = await Path.countDocuments({ userId: req.userId });
      if (count >= guest.maxPathsPerGuest) {
        return res.status(429).json({
          error: `Guests are limited to ${guest.maxPathsPerGuest} path${guest.maxPathsPerGuest === 1 ? "" : "s"}. Sign in to keep going.`,
          code: "guest_path_limit",
        });
      }
    }

    if (type === "evaluation") {
      const since = new Date(Date.now() - 24 * 3600 * 1000);
      // The two counts are independent — run them concurrently. They were
      // previously serialized, doubling the worst-case latency before a guest
      // could be admitted.
      const [userCount, globalCount] = await Promise.all([
        Evaluation.countDocuments({ userId: req.userId }),
        Evaluation.countDocuments({ createdAt: { $gte: since } }),
      ]);
      if (userCount >= guest.maxEvalsPerGuest) {
        return res.status(429).json({
          error: `Guests are limited to ${guest.maxEvalsPerGuest} project evaluations. Sign in to keep going.`,
          code: "guest_eval_limit",
        });
      }
      if (globalCount >= guest.maxEvalsPerDayGlobal) {
        return res.status(429).json({
          error: "We've hit our daily evaluation cap. Please try again in a few hours, or sign in.",
          code: "global_eval_limit",
        });
      }

      // Optionally strip screenshots
      if (!guest.allowScreenshots && req.body?.screenshots?.length) {
        req.body.screenshots = [];
      }
    }

    next();
  };
}
