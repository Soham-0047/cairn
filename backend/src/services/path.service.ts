import { z } from "zod";
import { getRouter, LLMChainError } from "../llm/router.js";
import { PARSE_GOAL_PROMPT, PATH_GENERATION_PROMPT } from "../llm/prompts.js";
import { Resource } from "../models/Resource.js";
import { Path, PathDoc } from "../models/Path.js";
import { User } from "../models/User.js";
import { logger } from "../utils/logger.js";
import type { Types } from "mongoose";
import { searchResourcesForMilestone } from "./resource-search.service.js";
import { embedText } from "./embedding.service.js";
import { findSimilarPaths, upsertPath } from "./vector-store.service.js";

export type ParsedGoal = {
  targetRole: string;
  timelineWeeks: number;
  weeklyHours: number;
  currentSkills: { skill: string; level: number }[];
  background: string;
  feasibilityNote: string | null;
};

// Tolerant schema: LLMs frequently miss fields, return strings for numbers,
// or stringify nested objects. We coerce when possible, default when not, so
// downstream code never sees `undefined`.
const parsedGoalSchema = z
  .object({
    targetRole: z.preprocess(
      (v) => (typeof v === "string" && v.trim() ? v.trim() : "Software engineer"),
      z.string(),
    ),
    timelineWeeks: z.preprocess(
      (v) => {
        const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
        return Number.isFinite(n) && n > 0 ? Math.min(52, Math.max(4, n)) : 12;
      },
      z.number(),
    ),
    weeklyHours: z.preprocess(
      (v) => {
        const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
        return Number.isFinite(n) && n > 0 ? Math.min(40, Math.max(1, n)) : 10;
      },
      z.number(),
    ),
    currentSkills: z.preprocess(
      (v) => {
        if (!Array.isArray(v)) return [];
        return v
          .map((s) => {
            if (!s || typeof s !== "object") return null;
            const obj = s as Record<string, unknown>;
            const skill = typeof obj.skill === "string" ? obj.skill : "";
            const lvl = typeof obj.level === "number" ? obj.level : parseInt(String(obj.level ?? "1"), 10);
            if (!skill.trim()) return null;
            return { skill: skill.trim(), level: Number.isFinite(lvl) ? Math.min(5, Math.max(1, lvl)) : 1 };
          })
          .filter(Boolean);
      },
      z.array(z.object({ skill: z.string(), level: z.number() })),
    ),
    background: z.preprocess(
      (v) => (typeof v === "string" ? v : ""),
      z.string(),
    ),
    feasibilityNote: z.preprocess(
      (v) => (typeof v === "string" && v.trim() ? v : null),
      z.string().nullable(),
    ),
  })
  .passthrough();

export async function parseGoal(goal: string): Promise<ParsedGoal> {
  const router = getRouter();
  const { response } = await router.call("parse_goal", {
    messages: [
      { role: "system", content: PARSE_GOAL_PROMPT },
      { role: "user", content: goal },
    ],
    jsonSchema: { type: "object" }, // Hint to the provider; full schema is in the prompt.
    temperature: 0.1,
    maxTokens: 1024,
    // Only reject totally non-JSON / non-object responses. We *don't* require
    // targetRole here because the schema's preprocess defaults are good enough
    // to keep the path-generation flow alive when fields are missing — and we
    // would rather fall through to defaults than burn the whole chain when
    // the model returned a 200 with a slightly-off shape.
    validate: (content) => {
      const c = typeof content === "string"
        ? (() => { try { return JSON.parse(content); } catch { return null; } })()
        : content;
      if (!c || typeof c !== "object") return "empty or non-JSON response";
      return null;
    },
  });
  const raw = response.content;
  // Some providers return content as a JSON string instead of parsed object.
  let candidate: unknown = raw;
  if (typeof raw === "string") {
    try {
      candidate = JSON.parse(raw);
    } catch {
      candidate = {};
    }
  }
  const parsed = parsedGoalSchema.safeParse(candidate ?? {});
  if (!parsed.success) {
    logger.warn({ raw, errors: parsed.error.flatten() }, "parseGoal: schema fallback");
    // Final fallback — never throw from parse, since the path-generation flow
    // can still proceed with sensible defaults derived from the user's text.
    return {
      targetRole: "Software engineer",
      timelineWeeks: 12,
      weeklyHours: 10,
      currentSkills: [],
      background: goal.slice(0, 200),
      feasibilityNote: null,
    };
  }
  // If the LLM gave us a hollow profile (e.g. defaults-only — no skills, empty
  // background), enrich background from the user's raw goal so the downstream
  // path-generation prompt still has signal to work with.
  const data = parsed.data as ParsedGoal;
  if (!data.background || !data.background.trim()) {
    data.background = goal.slice(0, 300);
  }
  return data;
}

async function pickResources(profile: ParsedGoal, goalText?: string) {
  const topics = new Set<string>();
  // Naive topic extraction. Guard every field — bad LLM output should degrade
  // the recommendation set, not crash the request (see prior 502 incident).
  const role = typeof profile?.targetRole === "string" ? profile.targetRole : "";
  for (const word of role.toLowerCase().split(/\s+/).filter((w) => w.length > 2)) topics.add(word);
  const skills = Array.isArray(profile?.currentSkills) ? profile.currentSkills : [];
  for (const s of skills) {
    const skill = typeof s?.skill === "string" ? s.skill : "";
    if (skill) topics.add(skill.toLowerCase());
  }
  // Pull keywords from the background and the user's raw goal too — many
  // realistic inputs ("become an AI engineer", "learn React") put the actual
  // technical keywords here, not in targetRole.
  const bag = `${profile?.background || ""} ${goalText || ""}`.toLowerCase();
  for (const w of bag.split(/[^a-z0-9+-]+/).filter((w) => w.length > 2)) topics.add(w);
  topics.add("fundamentals");

  let docs = await Resource.find({
    enabled: true,
    topics: { $in: Array.from(topics) },
  })
    .sort({ qualityScore: -1 })
    .limit(80)
    .lean();

  // Cold-start safety net: if nothing matched, just send the top-ranked
  // resources so the LLM still has concrete URLs to choose from instead of
  // having to fabricate them (which is what causes empty/garbage paths).
  if (docs.length === 0) {
    docs = await Resource.find({ enabled: true })
      .sort({ qualityScore: -1 })
      .limit(40)
      .lean();
  }

  return docs.map((d) => ({
    title: d.title,
    url: d.url,
    type: d.type,
    durationMin: d.durationMin,
    topics: d.topics,
  }));
}

async function pickSimilarLearners(profile: ParsedGoal, goalText: string) {
  // Embed the new user's goal + role + skill summary and ask Qdrant for the 3
  // most similar past paths. Each one comes back with score + payload. We only
  // surface hits above the cosine-similarity floor (0.75) to keep noise out of
  // the LLM context.
  try {
    const embedString = `Goal: ${goalText}. Target: ${profile.targetRole}. Skills: ${
      profile.currentSkills.map((s) => `${s.skill}(${s.level})`).join(", ") || "none"
    }. Level: ${profile.currentSkills.length ? "intermediate" : "beginner"}`;
    const embedding = await embedText(embedString);
    const hits = await findSimilarPaths(embedding, 3);
    return hits.filter((h) => h.score > 0.75);
  } catch (err) {
    logger.warn(
      { err: err instanceof Error ? err.message : String(err) },
      "pickSimilarLearners: skipping (no embeddings)",
    );
    return [];
  }
}

/**
 * After Gemma returns a structured path, replace each milestone's resources
 * with 3 freshly-fetched live tutorials from Exa (with Tavily / corpus fallback).
 * Runs all milestone searches in parallel so the user-visible latency stays
 * close to a single search round-trip.
 */
type PlanPhase = {
  name?: string;
  description?: string;
  weeks?: number[];
  milestones?: PlanMilestone[];
  projects?: { skills?: string[] }[];
};
type PlanMilestone = {
  topic: string;
  resources?: unknown[];
};

async function attachLiveResources(phases: unknown): Promise<void> {
  if (!Array.isArray(phases)) return;
  const tasks: Promise<void>[] = [];
  for (const phase of phases as PlanPhase[]) {
    for (const milestone of phase.milestones || []) {
      const skills = phase.projects?.flatMap((p) => p.skills || []) || [];
      tasks.push(
        searchResourcesForMilestone(milestone.topic, skills).then((live) => {
          if (live.length === 0) return; // keep LLM-picked resources as fallback
          milestone.resources = live.map((r) => ({
            title: r.title,
            url: r.url,
            type: inferResourceType(r.url),
            expectedMinutes: 30,
            status: "pending" as const,
            source: r.source,
            summary: r.summary,
            publishedDate: r.publishedDate || "",
          }));
        }),
      );
    }
  }
  await Promise.all(tasks);
}

function inferResourceType(url: string): "video" | "article" | "course" | "book" | "doc" {
  const u = url.toLowerCase();
  if (u.includes("youtube.com") || u.includes("youtu.be") || u.includes("vimeo")) return "video";
  if (u.includes("/docs") || u.includes("developer.mozilla.org") || u.includes("docs.python.org")) return "doc";
  if (u.includes("freecodecamp.org/learn") || u.includes("coursera") || u.includes("udemy")) return "course";
  return "article";
}

type ResourceForPath = {
  title: string;
  url: string;
  type: string;
  durationMin?: number;
  topics?: string[];
};

/**
 * Deterministic last-resort path. Used when every model in the routing chain
 * fails (rate-limited, 404'd, or returned malformed JSON). Generates a
 * Foundations → Applied → Portfolio → Interview-prep skeleton sized to the
 * user's `timelineWeeks`, using whatever resources we could find from the
 * catalogue. Coarse, but always populated — so onboarding never dead-ends.
 */
function buildFallbackPath(
  profile: ParsedGoal,
  resources: ResourceForPath[],
): { summary: string; stretchGoalWarning?: string; phases: unknown } {
  const weeks = Math.max(4, Math.min(52, profile.timelineWeeks || 12));
  // Split into 4 phases proportional to weeks.
  const cuts = [
    Math.max(1, Math.round(weeks * 0.25)),
    Math.max(2, Math.round(weeks * 0.5)),
    Math.max(3, Math.round(weeks * 0.8)),
    weeks,
  ];
  const ranges: number[][] = [];
  let start = 1;
  for (const end of cuts) {
    const r: number[] = [];
    for (let w = start; w <= end; w++) r.push(w);
    if (r.length > 0) ranges.push(r);
    start = end + 1;
  }
  while (ranges.length < 4) ranges.push([weeks]);

  const phaseDefs = [
    {
      name: "Foundations",
      description: `Lock in the fundamentals needed for ${profile.targetRole}.`,
      topic: "Core concepts",
      summary: "Cover the foundational skills end-to-end.",
      deliverable: "Short writeup + 1 small exercise per week.",
      projects: [{
        title: "Foundations capstone",
        description: "Small project demonstrating the fundamentals you just learned.",
        difficulty: "easy" as const,
        expectedHours: 8,
        skills: ["fundamentals"],
        isNorthStar: false,
      }],
    },
    {
      name: "Applied",
      description: "Apply the fundamentals to realistic problems.",
      topic: "Hands-on application",
      summary: "Build something non-trivial using the core skills.",
      deliverable: "Working mini-project + README.",
      projects: [{
        title: "Applied mid-project",
        description: "Intermediate-scope build integrating two or more core skills.",
        difficulty: "medium" as const,
        expectedHours: 15,
        skills: ["applied"],
        isNorthStar: false,
      }],
    },
    {
      name: "Portfolio",
      description: "Ship a portfolio-worthy project that demonstrates the role.",
      topic: "Portfolio build",
      summary: "Deliver one substantive project end-to-end.",
      deliverable: "Deployed project + writeup.",
      projects: [{
        title: "North-star project",
        description: `End-to-end project showcasing ${profile.targetRole} skills.`,
        difficulty: "hard" as const,
        expectedHours: 25,
        skills: ["portfolio", "integration"],
        isNorthStar: true,
      }],
    },
    {
      name: "Interview prep",
      description: "Sharpen interview signal and finalise materials.",
      topic: "Interview readiness",
      summary: "Mock interviews, system-design drills, and resume polish.",
      deliverable: "Updated resume + 3 mock interview writeups.",
      projects: [{
        title: "Interview drills",
        description: "Targeted practice for the role's typical interview loop.",
        difficulty: "medium" as const,
        expectedHours: 10,
        skills: ["interviewing"],
        isNorthStar: false,
      }],
    },
  ];

  // Round-robin a few resources into each milestone so the dashboard isn't bare.
  const pool = resources.slice(0, 16);
  let cursor = 0;
  const pickRes = (n: number) => {
    const out: ResourceForPath[] = [];
    for (let i = 0; i < n && pool.length > 0; i++) {
      const r = pool[cursor % pool.length];
      if (r) out.push(r);
      cursor++;
    }
    return out.map((r) => ({
      title: r.title,
      url: r.url,
      type: r.type,
      expectedMinutes: r.durationMin || 60,
      status: "pending" as const,
    }));
  };

  const phases = phaseDefs.map((def, i) => {
    const phaseWeeks = ranges[i] || [];
    const milestones = phaseWeeks.map((week) => ({
      week,
      topic: def.topic,
      summary: def.summary,
      deliverable: def.deliverable,
      resources: pickRes(2),
      status: "pending" as const,
    }));
    return {
      name: def.name,
      description: def.description,
      weeks: phaseWeeks,
      milestones,
      projects: def.projects,
    };
  });

  return {
    summary: `A ${weeks}-week starter path for ${profile.targetRole}. Generated from the resource catalogue while the LLM providers were unavailable — refine your goal and regenerate any time.`,
    stretchGoalWarning: profile.feasibilityNote || undefined,
    phases,
  };
}

export async function generatePath(params: {
  userId: Types.ObjectId | string;
  goal: string;
  parsed?: ParsedGoal;
}): Promise<PathDoc> {
  const parsed = params.parsed ?? (await parseGoal(params.goal));
  logger.info({ userId: params.userId, parsed }, "Parsed goal");

  const [resources, similar] = await Promise.all([
    pickResources(parsed, params.goal),
    pickSimilarLearners(parsed, params.goal),
  ]);

  const router = getRouter();
  let planJson: {
    summary?: string;
    stretchGoalWarning?: string;
    phases?: unknown;
  } = {};
  let finalProvider = "";
  let finalModel = "";

  try {
    const { response, trace } = await router.call("generate_path", {
      messages: [
        {
          role: "system",
          content: "You output strict JSON. No prose. No markdown fences.",
        },
        {
          role: "user",
          content: PATH_GENERATION_PROMPT({
            profile: parsed,
            resources,
            similarLearners: similar,
          }),
        },
      ],
      jsonSchema: { type: "object" },
      temperature: 0.4,
      maxTokens: 8192,
      // Force the chain to retry if a model returns an object with no phases —
      // that's the symptom of "200 OK but the dashboard is empty".
      validate: (content) => {
        let c: unknown = content;
        if (typeof c === "string") {
          try { c = JSON.parse(c); } catch { return "non-JSON response"; }
        }
        if (!c || typeof c !== "object") return "empty response";
        const phases = (c as { phases?: unknown }).phases;
        if (!Array.isArray(phases) || phases.length === 0) return "no phases in output";
        const hasMilestones = phases.some(
          (p) => p && typeof p === "object" && Array.isArray((p as { milestones?: unknown }).milestones)
            && ((p as { milestones: unknown[] }).milestones.length > 0),
        );
        if (!hasMilestones) return "phases contained no milestones";
        return null;
      },
    });

    let planRaw: unknown = response.content;
    if (typeof planRaw === "string") {
      try { planRaw = JSON.parse(planRaw); } catch { planRaw = {}; }
    }
    planJson = (planRaw && typeof planRaw === "object" ? planRaw : {}) as typeof planJson;
    finalProvider = trace.finalProvider || "";
    finalModel = trace.finalModel || "";
  } catch (err) {
    // Last-resort safety net: if the entire LLM chain failed (rate limits,
    // 404s, validation rejections), don't strand the user on a blank
    // onboarding screen — synthesise a generic but usable starter path from
    // the resource catalogue and persist that, so the user has *something*
    // to work with and we don't block the hackathon flow on flaky providers.
    if (err instanceof LLMChainError) {
      logger.warn(
        { userId: params.userId, traceSummary: err.trace.attempts.map((a) => `${a.provider}/${a.model}:${a.status}`) },
        "generatePath: LLM chain exhausted — falling back to template path",
      );
      planJson = buildFallbackPath(parsed, resources);
      finalProvider = "fallback";
      finalModel = "template-v1";
    } else {
      throw err;
    }
  }

  // Defence-in-depth: should never trip given the fallback above.
  if (!Array.isArray(planJson.phases) || planJson.phases.length === 0) {
    planJson = buildFallbackPath(parsed, resources);
    finalProvider = "fallback";
    finalModel = "template-v1";
  }

  // Replace LLM-picked resource URLs with live tutorial search results so
  // milestones reference current pages, not whatever Gemma half-remembered.
  // Best-effort: if every backend fails the original LLM picks stay in place.
  try {
    await attachLiveResources(planJson.phases || []);
  } catch (err) {
    logger.warn(
      { err: err instanceof Error ? err.message : String(err) },
      "attachLiveResources failed — keeping LLM-picked resources",
    );
  }

  // Persist
  const created = await Path.create({
    userId: params.userId,
    goal: params.goal,
    targetRole: parsed.targetRole,
    timelineWeeks: parsed.timelineWeeks,
    summary: planJson.summary || "",
    stretchGoalWarning: planJson.stretchGoalWarning || parsed.feasibilityNote || "",
    phases: planJson.phases || [],
    generatedBy: { provider: finalProvider, model: finalModel },
  });

  // Update user profile snapshot
  await User.findByIdAndUpdate(params.userId, {
    "profile.currentSkills": parsed.currentSkills,
    "profile.targetRole": parsed.targetRole,
    "profile.timelineWeeks": parsed.timelineWeeks,
    "profile.weeklyHours": parsed.weeklyHours,
    "profile.background": parsed.background,
    onboarded: true,
  });

  // Fire-and-forget: embed this path's goal and upsert into Qdrant so the next
  // similar learner gets it surfaced. Failure here must not break the response.
  (async () => {
    try {
      const embedString = `Goal: ${params.goal}. Skills: ${parsed.currentSkills
        .map((s) => s.skill)
        .join(", ")}. Level: ${parsed.currentSkills.length ? "intermediate" : "beginner"}`;
      const embedding = await embedText(embedString);
      await upsertPath(String(created._id), embedding, {
        goal: params.goal,
        targetRole: parsed.targetRole,
        skills: parsed.currentSkills.map((s) => s.skill),
        level: parsed.currentSkills.length ? "intermediate" : "beginner",
      });
    } catch (err) {
      logger.warn(
        { err: err instanceof Error ? err.message : String(err), pathId: String(created._id) },
        "Qdrant upsert (post-save) failed",
      );
    }
  })();

  return created.toObject() as PathDoc;
}
