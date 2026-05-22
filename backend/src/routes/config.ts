import { Router } from "express";
import { getOrCreateSiteConfig, SiteConfig } from "../models/SiteConfig.js";

const router = Router();

/**
 * Public read of the site config — used by frontend on every page render to
 * theme + populate copy.
 */
router.get("/", async (_req, res) => {
  const cfg = await getOrCreateSiteConfig();
  // Expose only safe fields publicly (no token ceilings).
  res.json({
    brand: cfg.brand,
    copy: cfg.copy,
    strings: cfg.strings,
    features: cfg.features,
    seo: cfg.seo,
    // Public-safe guest info — limits visible so the UI can show them.
    guestMode: {
      enabled: cfg.guestMode.enabled,
      maxPathsPerGuest: cfg.guestMode.maxPathsPerGuest,
      maxEvalsPerGuest: cfg.guestMode.maxEvalsPerGuest,
      allowScreenshots: cfg.guestMode.allowScreenshots,
      sessionHours: cfg.guestMode.sessionHours,
      bannerText: cfg.guestMode.bannerText,
    },
  });
});

export default router;
