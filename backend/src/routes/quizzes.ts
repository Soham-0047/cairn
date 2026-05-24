import { Router } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import { Quiz } from "../models/Quiz.js";
import { requireUser, type AuthedRequest } from "../middleware/auth.js";
import { generateQuiz, attemptQuiz, masterySnapshot } from "../services/quiz.service.js";
import { LLMChainError } from "../llm/router.js";
import { logger } from "../utils/logger.js";

const router = Router();

const generateSchema = z.object({
  topic: z.string().min(2).max(120),
  level: z.number().int().min(1).max(5).optional(),
  n: z.number().int().min(3).max(10).optional(),
  pathId: z.string().optional(),
  phaseIndex: z.number().int().min(0).max(50).optional(),
  milestoneIndex: z.number().int().min(0).max(50).optional(),
});

router.post("/generate", requireUser, async (req: AuthedRequest, res) => {
  const parse = generateSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  try {
    const quiz = await generateQuiz({
      userId: req.userId!,
      topic: parse.data.topic,
      level: parse.data.level as 1 | 2 | 3 | 4 | 5 | undefined,
      n: parse.data.n,
      pathId: parse.data.pathId,
      phaseIndex: parse.data.phaseIndex,
      milestoneIndex: parse.data.milestoneIndex,
    });
    // Strip the answer keys from the response — the client only needs them
    // after they submit an attempt.
    res.json(stripAnswers(quiz));
  } catch (err) {
    logger.error({ err }, "quiz generation failed");
    if (err instanceof LLMChainError) {
      return res.status(502).json({
        error: "Quiz generation failed",
        message: err.message,
        trace: err.trace,
      });
    }
    res.status(502).json({
      error: "Quiz generation failed",
      message: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

router.get("/", requireUser, async (req: AuthedRequest, res) => {
  const docs = await Quiz.find({ userId: req.userId })
    .sort({ createdAt: -1 })
    .limit(30)
    .lean();
  res.json(docs.map(stripAnswers));
});

router.get("/mastery", requireUser, async (req: AuthedRequest, res) => {
  const snap = await masterySnapshot(req.userId!);
  res.json(snap);
});

router.get("/:id", requireUser, async (req: AuthedRequest, res) => {
  const id = req.params.id;
  if (typeof id !== "string" || !Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: "Not found" });
  }
  const quiz = await Quiz.findOne({ _id: id, userId: req.userId }).lean();
  if (!quiz) return res.status(404).json({ error: "Not found" });
  res.json(stripAnswers(quiz));
});

const attemptSchema = z.object({
  answers: z.array(z.number().int().min(-1).max(10)).min(1).max(10),
});

router.post("/:id/attempt", requireUser, async (req: AuthedRequest, res) => {
  const id = req.params.id;
  if (typeof id !== "string" || !Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: "Not found" });
  }
  const parse = attemptSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  try {
    const result = await attemptQuiz({
      userId: req.userId!,
      quizId: id,
      answers: parse.data.answers,
    });
    res.json({
      score: result.score,
      correct: result.correct,
      total: result.total,
      results: result.results,
      credentialIssued: result.credentialIssued,
      bestScore: result.quiz.bestScore,
    });
  } catch (err) {
    logger.error({ err }, "quiz attempt failed");
    res.status(400).json({
      error: "Attempt failed",
      message: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

type StrippedQuiz = {
  _id: unknown;
  topic: string;
  level: number;
  pathId?: unknown;
  phaseIndex?: number;
  milestoneIndex?: number;
  questions: { q: string; choices: string[] }[];
  attempts: unknown[];
  bestScore: number;
  generatedBy?: { provider?: string; model?: string };
  createdAt?: Date;
};

function stripAnswers(doc: Record<string, unknown>): StrippedQuiz {
  const questions = ((doc.questions as { q: string; choices: string[] }[] | undefined) || []).map(
    (q) => ({ q: q.q, choices: q.choices }),
  );
  return {
    _id: doc._id,
    topic: (doc.topic as string) || "",
    level: (doc.level as number) || 3,
    pathId: doc.pathId,
    phaseIndex: doc.phaseIndex as number | undefined,
    milestoneIndex: doc.milestoneIndex as number | undefined,
    questions,
    attempts: (doc.attempts as unknown[]) || [],
    bestScore: (doc.bestScore as number) || 0,
    generatedBy: doc.generatedBy as { provider?: string; model?: string } | undefined,
    createdAt: doc.createdAt as Date | undefined,
  };
}

export default router;
