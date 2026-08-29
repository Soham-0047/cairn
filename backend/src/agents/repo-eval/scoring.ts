import type { SpecialistResult } from "./specialists.js";

/**
 * Score aggregation.
 *
 * The previous formula was `structural*0.2 + review*0.65 + visual*0.15`, with
 * a flat +0.09 added when no screenshots were supplied — so a project with no
 * UI evidence received nine free points for the absence of evidence. It also
 * treated a reviewer that was guessing exactly like one that was certain.
 *
 * Three changes:
 *
 *  1. **Renormalise over present components.** A missing component redistributes
 *     its weight proportionally instead of paying out a constant. Submitting
 *     less evidence can no longer raise a score.
 *
 *  2. **Weight by the reviewer's own confidence.** A low-confidence lens keeps
 *     its opinion but carries less of the total, and the remaining lenses take
 *     up the slack. This is what stops a failed or hedging reviewer from
 *     dragging an otherwise well-evidenced score to the middle.
 *
 *  3. **Shrink toward the deterministic anchor when claims did not verify.**
 *     Groundedness — the share of claims that survived citation checking — is
 *     the system's own measure of how much of the review was real. When it is
 *     low, the score moves toward the structural signal, which is computed from
 *     the repository itself and cannot be hallucinated. A confident review
 *     built on claims that did not check out no longer scores like a verified
 *     one.
 */

export type ScoreComponent = {
  key: string;
  label: string;
  value: number;
  /** Nominal weight before confidence adjustment and renormalisation. */
  weight: number;
  /** Effective share of the final score, after all adjustments. */
  effectiveWeight: number;
  confidence?: "high" | "medium" | "low";
  present: boolean;
};

export type ScoreBreakdown = {
  final: number;
  /** Blend of the weighted components, before groundedness shrinkage. */
  modelScore: number;
  structural: number;
  groundedness: number;
  /** How far the score was pulled toward the structural anchor, 0-1. */
  shrinkage: number;
  components: ScoreComponent[];
  passed: boolean;
  passReason: string;
};

const CONFIDENCE_WEIGHT: Record<"high" | "medium" | "low", number> = {
  high: 1,
  medium: 0.8,
  low: 0.4,
};

const NOMINAL = {
  structural: 0.15,
  originality: 0.25,
  craft: 0.35,
  skillMatch: 0.15,
  visual: 0.1,
} as const;

const LABELS: Record<string, string> = {
  structural: "Structure & history",
  originality: "Originality",
  craft: "Code craft",
  skillMatch: "Skill match",
  visual: "Visual review",
};

/**
 * Groundedness below this contributes no shrinkage — some claims failing to
 * verify is normal and healthy, and a verifier that never rejects anything is
 * not doing its job. Only a report that is largely unverifiable gets pulled
 * back toward the deterministic score.
 */
const GROUNDEDNESS_FLOOR = 0.6;
/** Cap on shrinkage, so the model's work always retains most of the weight. */
const MAX_SHRINKAGE = 0.5;

export function aggregate(params: {
  structural: number;
  specialists: SpecialistResult[];
  visual: number | null;
  groundedness: number;
}): ScoreBreakdown {
  const byName = new Map(params.specialists.map((s) => [s.name, s]));

  const raw: Array<Omit<ScoreComponent, "effectiveWeight">> = [
    {
      key: "structural",
      label: LABELS.structural!,
      value: clamp01(params.structural),
      weight: NOMINAL.structural,
      present: true,
    },
  ];

  for (const key of ["originality", "craft", "skillMatch"] as const) {
    const s = byName.get(key);
    raw.push({
      key,
      label: LABELS[key]!,
      value: s ? clamp01(s.score) : 0,
      weight: NOMINAL[key],
      confidence: s?.confidence,
      present: !!s,
    });
  }

  raw.push({
    key: "visual",
    label: LABELS.visual!,
    value: params.visual === null ? 0 : clamp01(params.visual),
    weight: NOMINAL.visual,
    present: params.visual !== null,
  });

  // Confidence-adjusted weights over present components only.
  const adjusted = raw.map((c) => ({
    ...c,
    adj: c.present ? c.weight * (c.confidence ? CONFIDENCE_WEIGHT[c.confidence] : 1) : 0,
  }));
  const totalAdj = adjusted.reduce((sum, c) => sum + c.adj, 0);

  const components: ScoreComponent[] = adjusted.map((c) => ({
    key: c.key,
    label: c.label,
    value: c.value,
    weight: c.weight,
    confidence: c.confidence,
    present: c.present,
    effectiveWeight: totalAdj > 0 ? c.adj / totalAdj : 0,
  }));

  const modelScore =
    totalAdj > 0
      ? components.reduce((sum, c) => sum + c.value * c.effectiveWeight, 0)
      : clamp01(params.structural);

  // Shrink toward the structural anchor in proportion to unverified claims.
  const g = clamp01(params.groundedness);
  const shortfall = Math.max(0, GROUNDEDNESS_FLOOR - g) / GROUNDEDNESS_FLOOR;
  const shrinkage = Math.min(MAX_SHRINKAGE, shortfall);
  const structural = clamp01(params.structural);
  const final = modelScore * (1 - shrinkage) + structural * shrinkage;

  const originality = byName.get("originality");
  const originalityScore = originality ? clamp01(originality.score) : 0.5;
  const passed = final >= 0.65 && originalityScore >= 0.55;
  const passReason = passed
    ? `Final ${final.toFixed(2)} ≥ 0.65 and originality ${originalityScore.toFixed(2)} ≥ 0.55.`
    : final < 0.65
      ? `Final score ${final.toFixed(2)} is below the 0.65 threshold.`
      : `Originality ${originalityScore.toFixed(2)} is below the 0.55 floor — a credential should not certify work that may not be the author's.`;

  return {
    final: round2(final),
    modelScore: round2(modelScore),
    structural: round2(structural),
    groundedness: round2(g),
    shrinkage: round2(shrinkage),
    components,
    passed,
    passReason,
  };
}

function clamp01(n: number | undefined | null): number {
  if (typeof n !== "number" || Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
