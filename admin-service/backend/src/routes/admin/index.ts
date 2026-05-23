import { Router } from "express";
import credentialsRoutes from "./credentials.js";
import configRoutes from "./config.js";
import resourcesRoutes from "./resources.js";
import { requireAdmin } from "../../middleware/auth.js";

const router = Router();

router.use(requireAdmin);

router.get("/check", (_req, res) => res.json({ ok: true }));
router.use("/credentials", credentialsRoutes);
router.use("/config", configRoutes);
router.use("/resources", resourcesRoutes);

export default router;
