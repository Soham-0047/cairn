import { Router } from "express";
import credentialsRoutes from "./credentials.js";
import configRoutes from "./config.js";
import resourcesRoutes from "./resources.js";
import { requireServiceToken } from "../../middleware/auth.js";

const router = Router();

router.use(requireServiceToken);

router.get("/check", (_req, res) => res.json({ ok: true, service: "admin-service" }));
router.use("/credentials", credentialsRoutes);
router.use("/config", configRoutes);
router.use("/resources", resourcesRoutes);

export default router;
