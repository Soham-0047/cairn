import { embedText } from "./embedding.service.js";
import {
  findSimilarFingerprints,
  upsertFingerprint,
  type FingerprintMatch,
} from "./vector-store.service.js";
import { getRouter } from "../llm/router.js";
import { logger } from "../utils/logger.js";

/**
 * The plan calls for a vector-based originality check before the LLM code
 * review (section 8, "Project verification flow"). This service implements
 * that pre-stage. It is deliberately *small*: a deterministic similarity
 * search, escalated to a one-shot LLM verdict only when the similarity sits
 * in the ambiguous band. That way the eval pipeline never adds more than ~1
 * extra LLM call per project — important on free tiers.
 */

export interface OriginalityResult {
  /** 0..1 — 1.0 = entirely original, 0.0 = exact tutorial clone. */
  score: number;
  /** True when we believe this is a derivative work, not original. */
  flagged: boolean;
  /** Top matches that drove the verdict (for transparency in the UI). */
  matches: FingerprintMatch[];
  /** Short explanation surfaced to the user. */
  reasoning: string;
  /** Did we use the LLM verdict, the heuristic verdict, or none (skipped)? */
  source: "skipped" | "heuristic" | "llm";
}

/** Above this similarity the project is unambiguously a tutorial clone. */
const HARD_CLONE_THRESHOLD = 0.92;
/** Above this it might be — escalate to the LLM. */
const AMBIGUOUS_THRESHOLD = 0.75;

/**
 * Run the originality check on a repo snapshot. Returns gracefully when
 * Qdrant or embeddings are unavailable, so the wider eval pipeline can still
 * complete with `source: "skipped"`.
 */
export async function checkOriginality(input: {
  readme: string;
  codeExcerpts: string;
  description?: string;
}): Promise<OriginalityResult> {
  // Compose a "signature" of the project — README + first ~6K of code. We
  // deliberately keep this stable so the same repo always embeds identically.
  const signature = [
    input.description ? `Description: ${input.description}` : "",
    `README:\n${(input.readme || "").slice(0, 2000)}`,
    `CODE:\n${(input.codeExcerpts || "").slice(0, 6000)}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  let embedding: number[] | null = null;
  try {
    embedding = await embedText(signature);
  } catch (err) {
    logger.info(
      { err: err instanceof Error ? err.message : String(err) },
      "Originality check skipped — embedding unavailable",
    );
    return {
      score: 1,
      flagged: false,
      matches: [],
      reasoning: "Originality check skipped (no embedding key).",
      source: "skipped",
    };
  }

  const matches = await findSimilarFingerprints(embedding, 5);
  if (matches.length === 0) {
    return {
      score: 1,
      flagged: false,
      matches: [],
      reasoning: "No fingerprint matches — likely original work.",
      source: "skipped",
    };
  }

  const topMatch = matches[0]!;
  const topSim = topMatch.score;

  if (topSim >= HARD_CLONE_THRESHOLD) {
    return {
      score: Math.max(0, 1 - topSim),
      flagged: true,
      matches,
      reasoning: `Cosine similarity ${topSim.toFixed(2)} to ${topMatch.label || topMatch.sourceUrl} — almost certainly a tutorial clone.`,
      source: "heuristic",
    };
  }

  if (topSim < AMBIGUOUS_THRESHOLD) {
    return {
      score: 1 - topSim,
      flagged: false,
      matches,
      reasoning: `Closest match ${topSim.toFixed(2)} — well below the clone threshold.`,
      source: "heuristic",
    };
  }

  // Ambiguous band: ask the LLM for a context-aware verdict. Cheap fallback
  // chain (originality_check) — Gemma is enough here.
  try {
    const router = getRouter();
    const { response } = await router.call("originality_check", {
      messages: [
        {
          role: "system",
          content: "You output strict JSON only. No prose, no markdown fences.",
        },
        {
          role: "user",
          content: `You are checking whether a developer's submission is original work or a derivative of a known tutorial.

USER REPO SIGNATURE:
${signature.slice(0, 2500)}

CLOSEST KNOWN TUTORIAL:
${topMatch.label} (${topMatch.sourceUrl}) — cosine similarity ${topSim.toFixed(3)}

Decide whether the user's work is a derivative of this tutorial or independent work that happens to be in the same domain. Be conservative — call it independent only when there is clear evidence of original architecture, problem framing, or extension.

Output strict JSON:
{
  "isDerivative": true,
  "reasoning": "1-2 sentence explanation"
}

Output JSON only.`,
        },
      ],
      jsonSchema: { type: "object" },
      temperature: 0.1,
      maxTokens: 512,
      validate: (content) => {
        let c: unknown = content;
        if (typeof c === "string") {
          try {
            c = JSON.parse(c);
          } catch {
            return "non-JSON originality verdict";
          }
        }
        if (!c || typeof c !== "object") return "empty originality verdict";
        const cc = c as Record<string, unknown>;
        if (typeof cc.isDerivative !== "boolean") return "missing isDerivative";
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
    const data = (raw as { isDerivative?: boolean; reasoning?: string }) || {};
    return {
      score: data.isDerivative ? Math.max(0, 1 - topSim) : Math.min(1, 1 - topSim + 0.2),
      flagged: !!data.isDerivative,
      matches,
      reasoning: data.reasoning || `Ambiguous similarity ${topSim.toFixed(2)} — LLM verdict applied.`,
      source: "llm",
    };
  } catch (err) {
    // LLM chain failed — fall back to the heuristic. Don't fail the whole eval.
    logger.warn(
      { err: err instanceof Error ? err.message : String(err), topSim },
      "Originality LLM verdict failed — heuristic only",
    );
    return {
      score: 1 - topSim,
      flagged: topSim >= 0.85,
      matches,
      reasoning: `Ambiguous similarity ${topSim.toFixed(2)}; LLM verdict unavailable, so applying heuristic.`,
      source: "heuristic",
    };
  }
}

/** Seed the fingerprints collection with a curated list of known tutorial repos. */
export async function seedFingerprints(
  items: { sourceUrl: string; label: string; signature: string }[],
): Promise<{ added: number; failed: number }> {
  let added = 0;
  let failed = 0;
  for (const item of items) {
    try {
      const embedding = await embedText(item.signature);
      const id = item.sourceUrl.replace(/[^a-z0-9]/gi, "").slice(0, 24) || `fp-${added}`;
      const ok = await upsertFingerprint(id, embedding, {
        sourceUrl: item.sourceUrl,
        label: item.label,
      });
      if (ok) added++;
      else failed++;
    } catch (err) {
      logger.warn(
        { err: err instanceof Error ? err.message : String(err), sourceUrl: item.sourceUrl },
        "Fingerprint seed failed",
      );
      failed++;
    }
  }
  logger.info({ added, failed }, "Fingerprint seed run complete");
  return { added, failed };
}
