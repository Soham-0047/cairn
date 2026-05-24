import { z } from "zod";
import { Types } from "mongoose";
import { getRouter } from "../llm/router.js";
import { INTERVIEW_TURN_PROMPT, INTERVIEW_SCORE_PROMPT } from "../llm/prompts.js";
import { InterviewSession, InterviewSessionDoc } from "../models/InterviewSession.js";
import { logger } from "../utils/logger.js";

export type InterviewLevel = "junior" | "mid" | "senior";

export type StartInterviewInput = {
  userId: Types.ObjectId | string;
  role: string;
  level?: InterviewLevel;
  focus?: string;
};

/** Opens a new interview session and returns the interviewer's first turn. */
export async function startInterview(input: StartInterviewInput): Promise<InterviewSessionDoc> {
  const session = await InterviewSession.create({
    userId: input.userId,
    role: input.role,
    level: input.level || "junior",
    focus: input.focus || "",
    status: "active",
    messages: [],
  });
  await produceInterviewerTurn(session);
  return session.toObject() as InterviewSessionDoc;
}

/** Append the candidate's answer then produce the next interviewer turn. */
export async function postCandidateTurn(params: {
  userId: Types.ObjectId | string;
  sessionId: string;
  text: string;
  fromVoice?: boolean;
}): Promise<InterviewSessionDoc> {
  const session = await InterviewSession.findOne({
    _id: params.sessionId,
    userId: params.userId,
  });
  if (!session) throw new Error("Interview not found");
  if (session.status !== "active") throw new Error("Interview is already complete");

  session.messages.push({
    role: "candidate",
    content: params.text.slice(0, 4000),
    fromVoice: !!params.fromVoice,
    ts: new Date(),
  });
  await session.save();

  await produceInterviewerTurn(session);
  return session.toObject() as InterviewSessionDoc;
}

/** Finish a session and produce the structured scoring object. */
export async function finishInterview(params: {
  userId: Types.ObjectId | string;
  sessionId: string;
}): Promise<InterviewSessionDoc> {
  const session = await InterviewSession.findOne({
    _id: params.sessionId,
    userId: params.userId,
  });
  if (!session) throw new Error("Interview not found");
  if (session.status === "complete") return session.toObject() as InterviewSessionDoc;

  const router = getRouter();
  const start = Date.now();
  const { response, trace } = await router.call("interview_score", {
    messages: [
      { role: "system", content: "You output strict JSON only. No prose, no markdown fences." },
      {
        role: "user",
        content: INTERVIEW_SCORE_PROMPT({
          role: session.role,
          level: session.level as InterviewLevel,
          transcript: session.messages.map((m) => ({
            role: m.role as "interviewer" | "candidate",
            content: m.content,
          })),
        }),
      },
    ],
    jsonSchema: { type: "object" },
    temperature: 0.2,
    maxTokens: 1024,
    validate: (content) => {
      let c: unknown = content;
      if (typeof c === "string") {
        try {
          c = JSON.parse(c);
        } catch {
          return "non-JSON score response";
        }
      }
      if (!c || typeof c !== "object") return "empty score response";
      const cc = c as Record<string, unknown>;
      if (typeof cc.overall !== "number") return "missing overall score";
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
  const parsed = scoreSchema.safeParse(raw);
  if (parsed.success) {
    session.score = {
      overall: clamp01(parsed.data.overall),
      technical: clamp01(parsed.data.technical),
      communication: clamp01(parsed.data.communication),
      problemSolving: clamp01(parsed.data.problemSolving),
      seniority: parsed.data.seniority,
      strengths: parsed.data.strengths,
      improvements: parsed.data.improvements,
      summary: parsed.data.summary,
      recommendation: parsed.data.recommendation,
    };
  } else {
    logger.warn({ errors: parsed.error.flatten() }, "interview score schema fallback");
    session.score = {
      overall: 0,
      technical: 0,
      communication: 0,
      problemSolving: 0,
      seniority: session.level,
      strengths: [],
      improvements: [],
      summary: "Could not parse a score. Try running another mock interview — the model returned an unexpected shape.",
      recommendation: "",
    };
  }
  session.modelsUsed.push({
    stage: "score",
    provider: trace.finalProvider || "",
    model: trace.finalModel || "",
    latencyMs: Date.now() - start,
  });
  session.status = "complete";
  await session.save();
  return session.toObject() as InterviewSessionDoc;
}

async function produceInterviewerTurn(
  session: InstanceType<typeof InterviewSession>,
): Promise<void> {
  const router = getRouter();
  const start = Date.now();
  const { response, trace } = await router.call("interview_turn", {
    messages: [
      {
        role: "system",
        content: "You are an interviewer. Reply with ONE short message — no quotes, no JSON, no meta commentary.",
      },
      {
        role: "user",
        content: INTERVIEW_TURN_PROMPT({
          role: session.role,
          level: session.level as InterviewLevel,
          focus: session.focus || "",
          transcript: session.messages.map((m) => ({
            role: m.role as "interviewer" | "candidate",
            content: m.content,
          })),
          turnCount: session.messages.filter((m) => m.role === "interviewer").length + 1,
        }),
      },
    ],
    temperature: 0.7,
    maxTokens: 512,
    validate: (content) => {
      const text = typeof content === "string" ? content : JSON.stringify(content);
      if (!text || text.trim().length < 4) return "empty turn";
      return null;
    },
  });

  const text = typeof response.content === "string"
    ? response.content
    : JSON.stringify(response.content);
  session.messages.push({
    role: "interviewer",
    content: cleanInterviewerOutput(text),
    fromVoice: false,
    ts: new Date(),
  });
  session.modelsUsed.push({
    stage: "turn",
    provider: trace.finalProvider || "",
    model: trace.finalModel || "",
    latencyMs: Date.now() - start,
  });
  await session.save();
}

function cleanInterviewerOutput(text: string): string {
  // Strip surrounding quotes, markdown fences, leading "INTERVIEWER:" labels —
  // common artefacts from instruct models.
  let t = text.trim();
  t = t.replace(/^```[a-zA-Z]*\n?/g, "").replace(/```$/g, "").trim();
  t = t.replace(/^INTERVIEWER:\s*/i, "").trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    t = t.slice(1, -1).trim();
  }
  return t.slice(0, 2000);
}

function clamp01(n: number | undefined): number {
  if (typeof n !== "number" || Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

const scoreSchema = z.object({
  overall: z.preprocess((v) => Number(v) || 0, z.number()),
  technical: z.preprocess((v) => Number(v) || 0, z.number()),
  communication: z.preprocess((v) => Number(v) || 0, z.number()),
  problemSolving: z.preprocess((v) => Number(v) || 0, z.number()),
  seniority: z.preprocess((v) => (typeof v === "string" ? v : ""), z.string()),
  strengths: z.preprocess(
    (v) => (Array.isArray(v) ? v.filter((s) => typeof s === "string") : []),
    z.array(z.string()),
  ),
  improvements: z.preprocess(
    (v) => (Array.isArray(v) ? v.filter((s) => typeof s === "string") : []),
    z.array(z.string()),
  ),
  summary: z.preprocess((v) => (typeof v === "string" ? v : ""), z.string()),
  recommendation: z.preprocess(
    (v) => {
      const s = typeof v === "string" ? v : "";
      return ["strong_hire", "hire", "lean_hire", "no_hire", "strong_no_hire"].includes(s) ? s : "";
    },
    z.string(),
  ),
});
