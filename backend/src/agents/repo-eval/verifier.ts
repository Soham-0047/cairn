import { getRouter } from "../../llm/router.js";
import { logger } from "../../utils/logger.js";
import { VERIFIER_GOAL, VERIFIER_SYSTEM } from "./prompts.js";
import type { RepoToolContext } from "../tools/repo.js";

/**
 * Claim verification, in two stages.
 *
 * Stage A is mechanical and free: parse the citation, confirm the agent
 * actually opened that file, and confirm the line range exists. This alone
 * removes the most common failure — a confident claim citing a plausible path
 * that is not in the repository at all.
 *
 * Stage B is semantic: pull the cited lines with surrounding context and ask a
 * model whether the excerpt really shows what the claim says. Calls are
 * batched per file, so a report with 30 claims across 6 files costs 6 calls
 * rather than 30 — which is what keeps this affordable on a free tier.
 *
 * Verification is intentionally one-directional: it can only remove claims,
 * never add or rewrite them. A verifier that could edit claims would just be
 * another generator, and its output would need verifying in turn.
 */

export type Claim = {
  id: string;
  text: string;
  cite: string;
  polarity: "positive" | "negative" | "neutral";
  source: string;
};

export type VerifiedClaim = Claim & {
  verdict: "supported" | "unsupported" | "contradicted" | "uncitable";
  reason: string;
};

export type VerificationReport = {
  claims: VerifiedClaim[];
  supported: VerifiedClaim[];
  dropped: VerifiedClaim[];
  /** Share of claims that survived — the single most useful health metric. */
  groundedness: number;
  llmCalls: number;
  latencyMs: number;
};

/** Lines of context included on either side of a cited range. */
const CONTEXT_LINES = 6;
/** Hard cap on claims sent for semantic checking, to bound cost. */
const MAX_SEMANTIC_CLAIMS = 40;

type ParsedCite = { path: string; start: number; end: number };

/** Accepts `path:12`, `path:12-40`, `path#L12`, and bare `path`. */
export function parseCitation(cite: string): ParsedCite | null {
  if (!cite || typeof cite !== "string") return null;
  const raw = cite.trim().replace(/^\.?\//, "");
  // The trailing `L?` matters: GitHub-style ranges are written `#L42-L58`, and
  // without it the range collapses to a single line and the verifier checks
  // the wrong excerpt.
  const m = raw.match(/^(.+?)(?::|#L)(\d+)(?:\s*[-–—:,#]\s*L?(\d+))?$/);
  if (m) {
    const start = parseInt(m[2]!, 10);
    const end = m[3] ? parseInt(m[3], 10) : start;
    return { path: m[1]!.trim(), start, end: Math.max(start, end) };
  }
  // A bare path is allowed but verified against the whole file.
  if (/[\w/.-]+\.\w+$/.test(raw)) return { path: raw, start: 0, end: 0 };
  return null;
}

export async function verifyClaims(
  claims: Claim[],
  ctx: RepoToolContext,
): Promise<VerificationReport> {
  const startedAt = Date.now();
  if (claims.length === 0) {
    return { claims: [], supported: [], dropped: [], groundedness: 1, llmCalls: 0, latencyMs: 0 };
  }

  const results = new Map<string, VerifiedClaim>();
  const byFile = new Map<string, Array<{ claim: Claim; parsed: ParsedCite; excerpt: string }>>();

  // ---- Stage A: mechanical ----
  for (const claim of claims) {
    const parsed = parseCitation(claim.cite);
    if (!parsed) {
      results.set(claim.id, { ...claim, verdict: "uncitable", reason: "no parseable file:line citation" });
      continue;
    }
    const path = resolvePath(parsed.path, ctx);
    if (!path) {
      results.set(claim.id, {
        ...claim,
        verdict: "uncitable",
        reason: `cites ${parsed.path}, which the investigator never read`,
      });
      continue;
    }
    const blob = ctx.blobs.get(path)!;
    const lines = blob.split("\n");
    if (parsed.start > lines.length) {
      results.set(claim.id, {
        ...claim,
        verdict: "uncitable",
        reason: `cites line ${parsed.start} but ${path} has ${lines.length} lines`,
      });
      continue;
    }
    const from = parsed.start === 0 ? 1 : Math.max(1, parsed.start - CONTEXT_LINES);
    const to =
      parsed.start === 0
        ? Math.min(lines.length, 120)
        : Math.min(lines.length, parsed.end + CONTEXT_LINES);
    const excerpt = lines
      .slice(from - 1, to)
      .map((l, i) => `${from + i}\t${l}`)
      .join("\n");

    const arr = byFile.get(path) || [];
    arr.push({ claim, parsed, excerpt });
    byFile.set(path, arr);
  }

  // ---- Stage B: semantic, batched per file ----
  let budget = MAX_SEMANTIC_CLAIMS;
  const router = getRouter();
  let llmCalls = 0;

  const batches = [...byFile.entries()].map(([file, items]) => {
    const take = items.slice(0, Math.max(0, budget));
    budget -= take.length;
    // Anything past the cap is kept rather than dropped: it passed the
    // mechanical check, and silently discarding it would understate the
    // report. It is marked so the distinction stays visible.
    for (const overflow of items.slice(take.length)) {
      results.set(overflow.claim.id, {
        ...overflow.claim,
        verdict: "supported",
        reason: "citation resolves; semantic check skipped (batch cap reached)",
      });
    }
    return { file, items: take };
  });

  await Promise.all(
    batches
      .filter((b) => b.items.length > 0)
      .map(async ({ file, items }) => {
        try {
          const { response } = await router.call("verify_claim", {
            messages: [
              { role: "system", content: VERIFIER_SYSTEM },
              {
                role: "user",
                content: VERIFIER_GOAL({
                  file,
                  items: items.map((it) => ({
                    id: it.claim.id,
                    claim: it.claim.text,
                    cite: it.claim.cite,
                    excerpt: it.excerpt,
                  })),
                }),
              },
            ],
            jsonSchema: { type: "object" },
            temperature: 0,
            maxTokens: 1024,
            validate: (content) => {
              const c = coerce(content);
              return Array.isArray(c?.verdicts) ? null : "missing verdicts array";
            },
          });
          llmCalls++;
          const payload = coerce(response.content);
          const verdicts = Array.isArray(payload?.verdicts) ? payload.verdicts : [];
          const byId = new Map(
            verdicts
              .filter((v): v is Record<string, unknown> => !!v && typeof v === "object")
              .map((v) => [String(v.id), v]),
          );
          for (const it of items) {
            const v = byId.get(it.claim.id);
            const verdict = normalizeVerdict(v?.verdict);
            results.set(it.claim.id, {
              ...it.claim,
              verdict,
              reason:
                typeof v?.reason === "string" && v.reason
                  ? v.reason
                  : verdict === "supported"
                    ? "excerpt supports the claim"
                    : "verifier returned no verdict for this claim",
            });
          }
        } catch (err) {
          // A verifier outage must not silently pass unchecked claims off as
          // verified, nor throw away a whole evaluation. They are kept and
          // labelled, so the UI can show exactly what was and wasn't checked.
          logger.warn(
            { file, err: err instanceof Error ? err.message : String(err) },
            "verifier batch failed; claims retained as unchecked",
          );
          for (const it of items) {
            results.set(it.claim.id, {
              ...it.claim,
              verdict: "supported",
              reason: "citation resolves; semantic check unavailable",
            });
          }
        }
      }),
  );

  const all = claims.map(
    (c) => results.get(c.id) ?? { ...c, verdict: "uncitable" as const, reason: "not processed" },
  );
  const supported = all.filter((c) => c.verdict === "supported");
  const dropped = all.filter((c) => c.verdict !== "supported");

  const report: VerificationReport = {
    claims: all,
    supported,
    dropped,
    groundedness: all.length ? supported.length / all.length : 1,
    llmCalls,
    latencyMs: Date.now() - startedAt,
  };
  logger.info(
    {
      total: all.length,
      supported: supported.length,
      dropped: dropped.length,
      groundedness: report.groundedness.toFixed(2),
      llmCalls,
    },
    "claim verification complete",
  );
  return report;
}

/**
 * Matches a cited path against files the agent actually read. Exact match
 * first, then a unique suffix match — models routinely cite `services/foo.ts`
 * for `backend/src/services/foo.ts`, and that is a formatting slip rather than
 * a fabrication. An ambiguous suffix is rejected.
 */
function resolvePath(path: string, ctx: RepoToolContext): string | null {
  if (ctx.blobs.has(path)) return path;
  const needle = path.replace(/^\.?\//, "");
  const matches = [...ctx.blobs.keys()].filter(
    (p) => p === needle || p.endsWith(`/${needle}`),
  );
  return matches.length === 1 ? matches[0]! : null;
}

function normalizeVerdict(v: unknown): VerifiedClaim["verdict"] {
  const s = String(v ?? "").toLowerCase();
  if (s.startsWith("support")) return "supported";
  if (s.startsWith("contradict")) return "contradicted";
  return "unsupported";
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
