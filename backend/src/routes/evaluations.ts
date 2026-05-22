import { Router } from "express";
import { z } from "zod";
import { Evaluation } from "../models/Evaluation.js";
import { User } from "../models/User.js";
import { requireUser, type AuthedRequest } from "../middleware/auth.js";
import { checkGuestLimit } from "../middleware/guestLimits.js";
import { evaluateProject } from "../services/eval.service.js";
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
  const item = await Evaluation.findOne({ _id: req.params.id, userId: req.userId }).lean();
  if (!item) return res.status(404).json({ error: "Not found" });
  res.json(item);
});

export default router;
