import { Router } from "express";
import configRoutes from "./config.js";
import providerRoutes from "./providers.js";
import resourceRoutes from "./resources.js";
import statsRoutes from "./stats.js";
import guestRoutes from "./guests.js";
import credentialRoutes from "./credentials.js";
import { requireAdmin } from "../../middleware/auth.js";

const router = Router();

router.use(requireAdmin);

router.post("/check", (_req, res) => res.json({ ok: true }));
router.use("/config", configRoutes);
router.use("/providers", providerRoutes);
router.use("/resources", resourceRoutes);
router.use("/stats", statsRoutes);
router.use("/guests", guestRoutes);
router.use("/credentials", credentialRoutes);

export default router;
