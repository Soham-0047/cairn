import { Router } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import { Evaluation } from "../models/Evaluation.js";
import { User } from "../models/User.js";
import { requireUser, type AuthedRequest } from "../middleware/auth.js";
import { checkGuestLimit } from "../middleware/guestLimits.js";
import { evaluateProject, evalEvents, type EvalProgressEvent } from "../services/eval.service.js";
import { logger } from "../utils/logger.js";

const router = Router();

const evalSchema = z.object({
  repoUrl: z.string().url().refine((u) => u.includes("github.com"), {
    message: "Must be a GitHub repo URL",
  }),
  projectTitle: z.string().min(2).max(120),
  projectType: z.string().optional(),
  claimedSkills: z.array(z.string()).min(1).max(15),
  screenshots: z
    .array(
      z.object({
        label: z.string().optional(),
        dataUrl: z.string().regex(/^data:image\/(png|jpe?g|webp);base64,/, {
          message: "Must be a data: image URL",
        }),
      }),
    )
    .max(4)
    .optional(),
});

router.post("/", requireUser, checkGuestLimit("evaluation"), async (req: AuthedRequest, res) => {
  const parse = evalSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  const user = await User.findById(req.userId).lean();
  if (!user) return res.status(404).json({ error: "User not found" });

  try {
    const evalDoc = await evaluateProject({
      userId: req.userId!,
      repoUrl: parse.data.repoUrl,
      projectTitle: parse.data.projectTitle,
      projectType: parse.data.projectType,
      claimedSkills: parse.data.claimedSkills,
      screenshots: parse.data.screenshots,
      userAccessToken: user.githubAccessToken || undefined,
    });
    res.json(evalDoc);
  } catch (err) {
    logger.error({ err }, "evaluation crashed");
    res.status(502).json({
      error: "Evaluation failed",
      message: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

router.get("/", requireUser, async (req: AuthedRequest, res) => {
  const items = await Evaluation.find({ userId: req.userId })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  res.json(items);
});

router.get("/:id", requireUser, async (req: AuthedRequest, res) => {
  const id = req.params.id;
  if (typeof id !== "string" || !Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: "Not found" });
  }
  const item = await Evaluation.findOne({ _id: req.params.id, userId: req.userId }).lean();
  if (!item) return res.status(404).json({ error: "Not found" });
  res.json(item);
});

/**
 * SSE progress stream for a live evaluation. The frontend opens this on the
 * results page and lights up each stage as it completes. Auth runs against
 * the same JWT middleware as the REST endpoints; the existing REST GET above
 * remains the source of truth for already-complete evaluations.
 */
router.get("/:id/progress", requireUser, async (req: AuthedRequest, res) => {
  const id = req.params.id;
  if (typeof id !== "string" || !Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: "Not found" });
  }
  const item = await Evaluation.findOne({ _id: req.params.id, userId: req.userId }).lean();
  if (!item) return res.status(404).json({ error: "Not found" });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const evalId = String(item._id);
  const write = (event: EvalProgressEvent) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  // Replay current state so a late subscriber sees what already happened.
  const stages = item.stages || [];
  for (let i = 0; i < stages.length; i++) {
    const s = stages[i];
    if (!s) continue;
    write({ stage: i + 1, status: "complete", label: s.name, score: s.score });
  }
  if (item.status === "complete") {
    write({
      stage: "final",
      status: "complete",
      label: "Synthesis",
      passed: item.passed,
      finalScore: item.finalScore,
    });
    return res.end();
  }
  if (item.status === "failed") {
    write({ stage: "final", status: "failed", label: "Synthesis" });
    return res.end();
  }

  const listener = (event: EvalProgressEvent) => write(event);
  evalEvents.on(evalId, listener);

  const keepalive = setInterval(() => {
    res.write(": keepalive\n\n");
  }, 15_000);

  const cleanup = () => {
    clearInterval(keepalive);
    evalEvents.off(evalId, listener);
    logger.info({ evalId }, "SSE subscriber disconnected");
  };
  req.on("close", cleanup);
  req.on("error", cleanup);
});

export default router;
