import { getRouter } from "../../llm/router.js";
import { logger } from "../../utils/logger.js";
import {
  CRAFT_LENS,
  ORIGINALITY_LENS,
  SKILL_MATCH_LENS,
  SPECIALIST_SYSTEM,
} from "./prompts.js";
import type { InvestigationResult } from "./investigator.js";
import type { RepoToolContext } from "../tools/repo.js";

/**
 * Three reviewers, one lens each, run in parallel over the same evidence.
 *
 * The reason for splitting them: a single prompt scoring originality, craft
 * and skill-match together shares one context, and a model that forms a
 * favourable overall impression tends to carry it across all three axes — the
 * failure case being a polished tutorial clone that scores well everywhere.
 * Separate calls remove that shared context, so a repository can come out
 * well-built and unoriginal at once. Whether this actually decorrelates the
 * scores is measurable: the harness records all three per case.
 *
 * They run concurrently because they are independent. On a rate-limited free
 * tier that matters — three sequential calls at 15 RPM is most of a minute.
 */

export type SpecialistName = "originality" | "craft" | "skillMatch";

export type SpecialistResult = {
  name: SpecialistName;
  score: number;
  confidence: "high" | "medium" | "low";
  reasoning: string;
  claims: Array<{ text: string; cite: string; polarity: "positive" | "negative" }>;
  provider?: string;
  model?: string;
  latencyMs: number;
};

const LENSES: Record<SpecialistName, { role: string; question: string; rubric: string }> = {
  originality: ORIGINALITY_LENS,
  craft: CRAFT_LENS,
  skillMatch: SKILL_MATCH_LENS,
};

export async function runSpecialists(params: {
  investigation: InvestigationResult;
  ctx: RepoToolContext;
  claimedSkills: string[];
  projectTitle: string;
  originalitySignal?: { score: number; flagged: boolean; reasoning: string; matches: string[] } | null;
  onDone?: (r: SpecialistResult) => void;
}): Promise<SpecialistResult[]> {
  const dossier = buildDossier(params);
  const names = Object.keys(LENSES) as SpecialistName[];

  const results = await Promise.all(
    names.map((name) => runOne(name, dossier).then((r) => {
      params.onDone?.(r);
      return r;
    })),
  );
  return results;
}

async function runOne(name: SpecialistName, dossier: string): Promise<SpecialistResult> {
  const started = Date.now();
  const router = getRouter();
  try {
    const { response, trace } = await router.call("review_specialist", {
      messages: [
        { role: "system", content: SPECIALIST_SYSTEM(LENSES[name]) },
        { role: "user", content: dossier },
      ],
      jsonSchema: { type: "object" },
      temperature: 0.2,
      maxTokens: 1536,
      validate: (content) => {
        const c = coerce(content);
        const inner = (c?.final ?? c) as Record<string, unknown> | null;
        if (!inner) return "non-JSON response";
        return typeof inner.score === "number" || typeof inner.score === "string"
          ? null
          : "missing numeric score";
      },
    });
    const raw = coerce(response.content);
    const inner = (raw?.final ?? raw) as Record<string, any>;
    return {
      name,
      score: clamp01(Number(inner?.score)),
      confidence: normalizeConfidence(inner?.confidence),
      reasoning: typeof inner?.reasoning === "string" ? inner.reasoning : "",
      claims: normalizeClaims(inner?.claims),
      provider: trace.finalProvider,
      model: trace.finalModel,
      latencyMs: Date.now() - started,
    };
  } catch (err) {
    // One failed lens must not sink the evaluation. It returns a neutral,
    // zero-confidence score that the synthesis step down-weights, and the UI
    // shows the lens as unavailable rather than as a genuine 0.5.
    logger.warn(
      { specialist: name, err: err instanceof Error ? err.message : String(err) },
      "specialist failed; contributing a neutral score",
    );
    return {
      name,
      score: 0.5,
      confidence: "low",
      reasoning: "This reviewer was unavailable; its score is a neutral placeholder.",
      claims: [],
      latencyMs: Date.now() - started,
    };
  }
}

/**
 * The shared packet every specialist reads: the investigator's findings plus
 * the actual source it opened. Source is included so a specialist can cite
 * lines the investigator did not flag — otherwise every claim would be a
 * restatement of the investigation.
 */
function buildDossier(params: {
  investigation: InvestigationResult;
  ctx: RepoToolContext;
  claimedSkills: string[];
  projectTitle: string;
  originalitySignal?: { score: number; flagged: boolean; reasoning: string; matches: string[] } | null;
}): string {
  const { investigation, ctx } = params;
  const files = [...ctx.blobs.entries()];
  // Largest-read-first, then truncated as a whole, so the packet stays inside
  // the smallest context window in the chain.
  const budget = 40_000;
  let used = 0;
  const rendered: string[] = [];
  for (const [path, text] of files) {
    if (used >= budget) break;
    const room = Math.min(6_000, budget - used);
    const body = text
      .split("\n")
      .slice(0, 250)
      .map((l, i) => `${i + 1}\t${l}`)
      .join("\n")
      .slice(0, room);
    rendered.push(`--- ${path} ---\n${body}`);
    used += body.length;
  }

  const fingerprint = params.originalitySignal
    ? `\nFINGERPRINT CHECK (deterministic — embedding similarity against a corpus of known tutorial repositories)
Similarity: ${params.originalitySignal.score.toFixed(2)}${params.originalitySignal.flagged ? " — FLAGGED" : ""}
${params.originalitySignal.reasoning}
${params.originalitySignal.matches.length ? `Closest matches: ${params.originalitySignal.matches.slice(0, 3).join("; ")}` : "No close matches."}

Treat this as one input, not a verdict. Similarity to a tutorial can mean the author followed it, or that both solve a common problem the obvious way. The code decides which.\n`
    : "";

  return `PROJECT: "${params.projectTitle}"
Claimed skills: ${params.claimedSkills.join(", ") || "(none stated)"}

WHAT THE INVESTIGATOR FOUND
${investigation.projectSummary}

Stack: ${investigation.stack.join(", ") || "unidentified"}
Entry points: ${investigation.entryPoints.join(", ") || "unidentified"}
Tests present: ${investigation.testsPresent ? "yes" : "no"}
Commit history: ${investigation.historyNote || "unavailable"}
${fingerprint}

EVIDENCE GATHERED
${investigation.evidence.map((e) => `- [${e.kind}] ${e.claim}  (${e.cite})`).join("\n") || "- (none)"}

SOURCE THE INVESTIGATOR READ (line-numbered; cite these paths and lines)
${rendered.join("\n\n") || "(no files were read)"}`;
}

function normalizeClaims(v: unknown): SpecialistResult["claims"] {
  if (!Array.isArray(v)) return [];
  return v
    .map((c) => {
      if (!c || typeof c !== "object") return null;
      const o = c as Record<string, unknown>;
      const text = typeof o.text === "string" ? o.text.trim() : "";
      const cite = typeof o.cite === "string" ? o.cite.trim() : "";
      if (!text) return null;
      const polarity = String(o.polarity ?? "").toLowerCase().startsWith("neg")
        ? ("negative" as const)
        : ("positive" as const);
      return { text, cite, polarity };
    })
    .filter((c): c is SpecialistResult["claims"][number] => c !== null)
    .slice(0, 12);
}

function normalizeConfidence(v: unknown): "high" | "medium" | "low" {
  const s = String(v ?? "").toLowerCase();
  if (s.startsWith("high")) return "high";
  if (s.startsWith("low")) return "low";
  return "medium";
}

function clamp01(n: number): number {
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0.5;
}

function coerce(content: unknown): Record<string, any> | null {
  if (content && typeof content === "object") return content as Record<string, any>;
  if (typeof content === "string") {
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
  return null;
}
