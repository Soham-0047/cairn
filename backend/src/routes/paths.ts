import { Router } from "express";
import { z } from "zod";
import { Path } from "../models/Path.js";
import { requireUser, type AuthedRequest } from "../middleware/auth.js";
import { checkGuestLimit } from "../middleware/guestLimits.js";
import { generatePath, parseGoal } from "../services/path.service.js";
import { LLMChainError } from "../llm/router.js";
import { logger } from "../utils/logger.js";

const router = Router();

router.post("/parse", requireUser, async (req: AuthedRequest, res) => {
  const schema = z.object({ goal: z.string().min(10).max(2000) });
  const parse = schema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  try {
    const parsed = await parseGoal(parse.data.goal);
    res.json(parsed);
  } catch (err) {
    logger.error({ err }, "parse failed");
    res.status(502).json({ error: "Could not parse goal — try again." });
  }
});

router.post("/", requireUser, checkGuestLimit("path"), async (req: AuthedRequest, res) => {
  const schema = z.object({
    goal: z.string().min(10).max(2000),
  });
  const parse = schema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });

  try {
    // Abandon any existing active paths first
    await Path.updateMany(
      { userId: req.userId, status: "active" },
      { $set: { status: "abandoned" } },
    );
    const path = await generatePath({
      userId: req.userId!,
      goal: parse.data.goal,
    });
    res.json(path);
  } catch (err) {
    logger.error({ err }, "path generation failed");
    // When the LLM router exhausts its chain, include the per-attempt trace so
    // the admin can see which provider/model failed and why without grepping
    // server logs. Non-chain errors fall through to a plain message.
    if (err instanceof LLMChainError) {
      return res.status(502).json({
        error: "Path generation failed",
        message: err.message,
        trace: err.trace,
        hint: "Open /admin/credentials to verify keys, or /admin/providers to edit the routing chain.",
      });
    }
    res.status(502).json({
      error: "Path generation failed",
      message: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

router.get("/active", requireUser, async (req: AuthedRequest, res) => {
  const path = await Path.findOne({ userId: req.userId, status: "active" })
    .sort({ createdAt: -1 })
    .lean();
  res.json(path || null);
});

router.get("/:id", requireUser, async (req: AuthedRequest, res) => {
  const path = await Path.findOne({ _id: req.params.id, userId: req.userId }).lean();
  if (!path) return res.status(404).json({ error: "Not found" });
  res.json(path);
});

router.post("/:id/milestone/done", requireUser, async (req: AuthedRequest, res) => {
  const { phaseIndex, milestoneIndex } = req.body as { phaseIndex: number; milestoneIndex: number };
  const update = await Path.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    {
      $set: { [`phases.${phaseIndex}.milestones.${milestoneIndex}.status`]: "done" },
    },
    { new: true },
  ).lean();
  if (!update) return res.status(404).json({ error: "Not found" });
  res.json(update);
});

export default router;
