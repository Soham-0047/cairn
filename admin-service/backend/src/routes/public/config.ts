import { Router } from "express";
import { getOrCreateSiteConfig } from "../../models/SiteConfig.js";

const router = Router();

router.get("/", async (req, res) => {
  const key = (req.query.key as string | undefined) || "default";
  const cfg = await getOrCreateSiteConfig(key);
  res.json(cfg);
});

export default router;
