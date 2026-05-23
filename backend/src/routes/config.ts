import { Router } from "express";
import { getOrCreateSiteConfig } from "../models/SiteConfig.js";
import { fetchSiteConfig, isEnabled as adminServiceEnabled } from "../services/admin-client.js";
import { logger } from "../utils/logger.js";

const router = Router();

type AnyCfg = {
  brand?: unknown;
  copy?: unknown;
  strings?: unknown;
  features?: unknown;
  seo?: unknown;
  guestMode?: {
    enabled?: boolean;
    maxPathsPerGuest?: number;
    maxEvalsPerGuest?: number;
    allowScreenshots?: boolean;
    sessionHours?: number;
    bannerText?: string;
  };
};

/**
 * Public read of the site config. Source:
 *   1. Admin-service when enabled (and reachable).
 *   2. Local Mongo `SiteConfig` singleton as fallback.
 *
 * The admin-service may return a `strings` Map serialized as an object, while
 * Mongoose returns it as a Map — both are normalized for the frontend.
 */
router.get("/", async (_req, res) => {
  let cfg: AnyCfg | null = null;
  if (adminServiceEnabled()) {
    cfg = await fetchSiteConfig<AnyCfg>().catch((err) => {
      logger.warn({ err: (err as Error).message }, "Falling back to local SiteConfig");
      return null;
    });
  }
  if (!cfg) cfg = await getOrCreateSiteConfig();

  const guest = cfg.guestMode || {};
  res.json({
    brand: cfg.brand,
    copy: cfg.copy,
    strings: cfg.strings,
    features: cfg.features,
    seo: cfg.seo,
    guestMode: {
      enabled: guest.enabled,
      maxPathsPerGuest: guest.maxPathsPerGuest,
      maxEvalsPerGuest: guest.maxEvalsPerGuest,
      allowScreenshots: guest.allowScreenshots,
      sessionHours: guest.sessionHours,
      bannerText: guest.bannerText,
    },
  });
});

export default router;
