import { Router } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import { InterviewSession } from "../models/InterviewSession.js";
import { requireUser, type AuthedRequest } from "../middleware/auth.js";
import {
  startInterview,
  postCandidateTurn,
  finishInterview,
} from "../services/interview.service.js";
import { LLMChainError } from "../llm/router.js";
import { logger } from "../utils/logger.js";

const router = Router();

const startSchema = z.object({
  role: z.string().min(2).max(120),
  level: z.enum(["junior", "mid", "senior"]).optional(),
  focus: z.string().max(200).optional(),
});

router.post("/", requireUser, async (req: AuthedRequest, res) => {
  const parse = startSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  try {
    const session = await startInterview({
      userId: req.userId!,
      role: parse.data.role,
      level: parse.data.level,
      focus: parse.data.focus,
    });
    res.json(session);
  } catch (err) {
    logger.error({ err }, "interview start failed");
    if (err instanceof LLMChainError) {
      return res.status(502).json({
        error: "Interview start failed",
        message: err.message,
        trace: err.trace,
      });
    }
    res.status(502).json({
      error: "Interview start failed",
      message: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

router.get("/", requireUser, async (req: AuthedRequest, res) => {
  const items = await InterviewSession.find({ userId: req.userId })
    .sort({ createdAt: -1 })
    .limit(30)
    .lean();
  res.json(items);
});

router.get("/:id", requireUser, async (req: AuthedRequest, res) => {
  const id = req.params.id;
  if (typeof id !== "string" || !Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: "Not found" });
  }
  const item = await InterviewSession.findOne({ _id: id, userId: req.userId }).lean();
  if (!item) return res.status(404).json({ error: "Not found" });
  res.json(item);
});

const turnSchema = z.object({
  text: z.string().min(1).max(4000),
  fromVoice: z.boolean().optional(),
});

router.post("/:id/turn", requireUser, async (req: AuthedRequest, res) => {
  const id = req.params.id;
  if (typeof id !== "string" || !Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: "Not found" });
  }
  const parse = turnSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  try {
    const session = await postCandidateTurn({
      userId: req.userId!,
      sessionId: id,
      text: parse.data.text,
      fromVoice: parse.data.fromVoice,
    });
    res.json(session);
  } catch (err) {
    logger.error({ err }, "interview turn failed");
    if (err instanceof LLMChainError) {
      return res.status(502).json({
        error: "Interviewer turn failed",
        message: err.message,
        trace: err.trace,
      });
    }
    res.status(502).json({
      error: "Interviewer turn failed",
      message: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

router.post("/:id/finish", requireUser, async (req: AuthedRequest, res) => {
  const id = req.params.id;
  if (typeof id !== "string" || !Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: "Not found" });
  }
  try {
    const session = await finishInterview({ userId: req.userId!, sessionId: id });
    res.json(session);
  } catch (err) {
    logger.error({ err }, "interview finish failed");
    if (err instanceof LLMChainError) {
      return res.status(502).json({
        error: "Scoring failed",
        message: err.message,
        trace: err.trace,
      });
    }
    res.status(502).json({
      error: "Scoring failed",
      message: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

export default router;
