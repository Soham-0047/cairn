import { Types } from "mongoose";
import { z } from "zod";
import { getRouter } from "../llm/router.js";
import { QUIZ_GENERATION_PROMPT } from "../llm/prompts.js";
import { Quiz, QuizDoc } from "../models/Quiz.js";
import { Credential } from "../models/Credential.js";
import { Path } from "../models/Path.js";
import { logger } from "../utils/logger.js";

const questionShape = z.object({
  q: z.string().min(5),
  choices: z.array(z.string()).min(2).max(6),
  answerIndex: z.number().int().min(0),
  explanation: z.string().default(""),
});

const quizShape = z.object({
  topic: z.string().default(""),
  questions: z.array(questionShape).min(1),
});

export type GenerateQuizInput = {
  userId: Types.ObjectId | string;
  topic: string;
  level?: 1 | 2 | 3 | 4 | 5;
  n?: number;
  pathId?: string;
  phaseIndex?: number;
  milestoneIndex?: number;
};

/** Generate a fresh quiz via the router. Persists the questions but never
 *  exposes `answerIndex` to the caller until they submit an attempt. */
export async function generateQuiz(input: GenerateQuizInput): Promise<QuizDoc> {
  const router = getRouter();
  const level = (input.level ?? 3) as 1 | 2 | 3 | 4 | 5;
  const n = Math.max(3, Math.min(10, input.n ?? 5));

  const { response, trace } = await router.call("generate_quiz", {
    messages: [
      { role: "system", content: "You output strict JSON only. No prose, no markdown fences." },
      { role: "user", content: QUIZ_GENERATION_PROMPT({ topic: input.topic, level, n }) },
    ],
    jsonSchema: { type: "object" },
    temperature: 0.3,
    maxTokens: 2048,
    validate: (content) => {
      let c: unknown = content;
      if (typeof c === "string") {
        try {
          c = JSON.parse(c);
        } catch {
          return "non-JSON quiz response";
        }
      }
      const parsed = quizShape.safeParse(c);
      if (!parsed.success) return "quiz JSON missing required fields";
      // Reject quizzes where answerIndex is out of range — those are unusable.
      for (const q of parsed.data.questions) {
        if (q.answerIndex >= q.choices.length) return "answerIndex out of range";
      }
      return null;
    },
  });

  let raw: unknown = response.content;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = {};
    }
  }
  const parsed = quizShape.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Quiz JSON validation failed: ${parsed.error.message}`);
  }

  const quiz = await Quiz.create({
    userId: input.userId,
    topic: input.topic,
    level,
    pathId: input.pathId,
    phaseIndex: input.phaseIndex,
    milestoneIndex: input.milestoneIndex,
    questions: parsed.data.questions,
    generatedBy: {
      provider: trace.finalProvider || "",
      model: trace.finalModel || "",
    },
  });

  logger.info(
    { userId: input.userId, topic: input.topic, level, n: parsed.data.questions.length },
    "Quiz generated",
  );
  return quiz.toObject() as QuizDoc;
}

/** Grade an attempt, persist it, and mint a quiz_mastery credential when
 *  the score crosses 0.8 (the plan's "mastery" threshold). */
export async function attemptQuiz(params: {
  userId: Types.ObjectId | string;
  quizId: string;
  answers: number[];
}): Promise<{
  quiz: QuizDoc;
  score: number;
  correct: number;
  total: number;
  results: { correct: boolean; correctIndex: number; explanation: string }[];
  credentialIssued: boolean;
}> {
  const quiz = await Quiz.findOne({ _id: params.quizId, userId: params.userId });
  if (!quiz) throw new Error("Quiz not found");
  if (params.answers.length !== quiz.questions.length) {
    throw new Error(`Expected ${quiz.questions.length} answers, got ${params.answers.length}`);
  }

  const results: { correct: boolean; correctIndex: number; explanation: string }[] = [];
  let correct = 0;
  for (let i = 0; i < quiz.questions.length; i++) {
    const q = quiz.questions[i]!;
    const isCorrect = params.answers[i] === q.answerIndex;
    if (isCorrect) correct++;
    results.push({
      correct: isCorrect,
      correctIndex: q.answerIndex,
      explanation: q.explanation || "",
    });
  }
  const total = quiz.questions.length;
  const score = total === 0 ? 0 : correct / total;

  quiz.attempts.push({
    answers: params.answers,
    correct,
    total,
    score,
    attemptedAt: new Date(),
  });
  if (score > quiz.bestScore) quiz.bestScore = score;
  await quiz.save();

  // Mark the linked milestone done when mastery is reached — same shape as the
  // existing `POST /paths/:id/milestone/done` route does.
  if (
    score >= 0.8 &&
    quiz.pathId &&
    typeof quiz.phaseIndex === "number" &&
    typeof quiz.milestoneIndex === "number"
  ) {
    await Path.findOneAndUpdate(
      { _id: quiz.pathId, userId: params.userId },
      {
        $set: {
          [`phases.${quiz.phaseIndex}.milestones.${quiz.milestoneIndex}.status`]: "done",
        },
      },
    ).catch(() => {});
  }

  // Mint a credential for first-time mastery passes only. Multiple credentials
  // for the same quiz would inflate the portfolio.
  let credentialIssued = false;
  if (score >= 0.8) {
    const existing = await Credential.findOne({
      userId: params.userId,
      type: "quiz_mastery",
      title: quiz.topic,
    }).lean();
    if (!existing) {
      const issuedAt = new Date();
      const userIdStr = String(params.userId);
      const signature = Credential.signPayload({
        userId: userIdStr,
        type: "quiz_mastery",
        title: quiz.topic,
        issuedAt,
      });
      await Credential.create({
        userId: params.userId,
        type: "quiz_mastery",
        title: quiz.topic,
        skills: [quiz.topic],
        evidence: {
          score,
        },
        issuedAt,
        signature,
      });
      credentialIssued = true;
    }
  }

  return {
    quiz: quiz.toObject() as QuizDoc,
    score,
    correct,
    total,
    results,
    credentialIssued,
  };
}

/** Quick "mastery snapshot" used by portfolio + dashboard widgets. */
export async function masterySnapshot(userId: Types.ObjectId | string): Promise<{
  topics: { topic: string; bestScore: number; attempts: number }[];
  totalQuizzes: number;
  averageBest: number;
}> {
  const docs = await Quiz.find({ userId })
    .select("topic bestScore attempts")
    .sort({ bestScore: -1 })
    .lean();
  const byTopic = new Map<string, { topic: string; bestScore: number; attempts: number }>();
  for (const d of docs) {
    const cur = byTopic.get(d.topic);
    if (!cur) {
      byTopic.set(d.topic, {
        topic: d.topic,
        bestScore: d.bestScore || 0,
        attempts: d.attempts?.length || 0,
      });
    } else {
      cur.bestScore = Math.max(cur.bestScore, d.bestScore || 0);
      cur.attempts += d.attempts?.length || 0;
    }
  }
  const topics = Array.from(byTopic.values());
  const averageBest = topics.length === 0 ? 0 : topics.reduce((s, t) => s + t.bestScore, 0) / topics.length;
  return { topics, totalQuizzes: docs.length, averageBest };
}
