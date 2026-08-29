/**
 * Metrics for comparing two evaluation pipelines against human reference
 * grades.
 *
 * The primary metric is Spearman rank correlation, not mean error. What a
 * reviewer needs from this system is a trustworthy *ordering* — "is this
 * candidate's project stronger than that one" — and absolute calibration is
 * a separate, easier problem (any systematic offset can be corrected with a
 * threshold). A pipeline that scores everything 0.2 too high but ranks
 * perfectly is useful; one that hits the average and shuffles the order is not.
 *
 * Mean absolute error is reported alongside it, because a system that ranks
 * well but scores everyone 0.9 still can't have a pass threshold set on it.
 */

export type Paired = { predicted: number; reference: number };

/** Spearman's ρ. Returns 0 for fewer than three pairs or no variance. */
export function spearman(pairs: Paired[]): number {
  if (pairs.length < 3) return 0;
  const rank = (values: number[]): number[] => {
    const indexed = values.map((v, i) => ({ v, i }));
    indexed.sort((a, b) => a.v - b.v);
    const ranks = new Array<number>(values.length);
    let i = 0;
    while (i < indexed.length) {
      // Ties share the average of the ranks they span, which is what keeps ρ
      // well-defined on a rubric with a small number of discrete grades.
      let j = i;
      while (j + 1 < indexed.length && indexed[j + 1]!.v === indexed[i]!.v) j++;
      const avg = (i + j) / 2 + 1;
      for (let k = i; k <= j; k++) ranks[indexed[k]!.i] = avg;
      i = j + 1;
    }
    return ranks;
  };

  const rp = rank(pairs.map((p) => p.predicted));
  const rr = rank(pairs.map((p) => p.reference));
  const n = pairs.length;
  const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
  const mp = mean(rp);
  const mr = mean(rr);
  let num = 0;
  let dp = 0;
  let dr = 0;
  for (let i = 0; i < n; i++) {
    const a = rp[i]! - mp;
    const b = rr[i]! - mr;
    num += a * b;
    dp += a * a;
    dr += b * b;
  }
  const den = Math.sqrt(dp * dr);
  return den === 0 ? 0 : round3(num / den);
}

export function meanAbsoluteError(pairs: Paired[]): number {
  if (pairs.length === 0) return 0;
  return round3(
    pairs.reduce((s, p) => s + Math.abs(p.predicted - p.reference), 0) / pairs.length,
  );
}

/**
 * Share of adjacent pairs the pipeline orders the same way the reference does.
 * Easier to read than ρ when reporting to a non-statistical audience, and it
 * answers the question a recruiter actually asks: given two projects, does it
 * pick the better one?
 */
export function pairwiseAccuracy(pairs: Paired[]): number {
  let correct = 0;
  let total = 0;
  for (let i = 0; i < pairs.length; i++) {
    for (let j = i + 1; j < pairs.length; j++) {
      const a = pairs[i]!;
      const b = pairs[j]!;
      if (a.reference === b.reference) continue; // no ground-truth ordering
      total++;
      const refOrder = a.reference > b.reference;
      const predOrder = a.predicted > b.predicted;
      if (refOrder === predOrder) correct++;
    }
  }
  return total === 0 ? 0 : round3(correct / total);
}

/** Agreement with the reference pass/fail decision at a given threshold. */
export function passAgreement(
  pairs: Paired[],
  threshold: number,
): { accuracy: number; falsePass: number; falseFail: number } {
  let correct = 0;
  let falsePass = 0;
  let falseFail = 0;
  for (const p of pairs) {
    const predPass = p.predicted >= threshold;
    const refPass = p.reference >= threshold;
    if (predPass === refPass) correct++;
    else if (predPass) falsePass++;
    else falseFail++;
  }
  return {
    accuracy: pairs.length ? round3(correct / pairs.length) : 0,
    falsePass,
    falseFail,
  };
}

export function mean(values: number[]): number {
  return values.length ? round3(values.reduce((s, v) => s + v, 0) / values.length) : 0;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
