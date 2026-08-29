import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

/**
 * The evaluation set.
 *
 * ## The rubric
 *
 * Every case carries a reference grade in [0,1] — what a qualified reviewer
 * would say the repository is worth as evidence of the author's ability. The
 * bands:
 *
 *   0.90-1.00  Production software. Tested, documented, handles failure, used
 *              by people other than the author.
 *   0.70-0.89  Strong personal project. Real functionality, some tests, clear
 *              structure, decisions the author can defend.
 *   0.50-0.69  Working but shallow. Runs, does something, thin on tests and
 *              error handling. A tutorial meaningfully extended sits here.
 *   0.30-0.49  A followed tutorial, or a scaffold with little added.
 *   0.00-0.29  Empty, broken, or a verbatim copy.
 *
 * ## Grading these yourself
 *
 * The grades below are **provisional**: they are a starting point, not measured
 * ground truth, and repositories change. Before citing any headline number,
 * regrade the set — open each repository, apply the bands above, and write your
 * grades to a JSON file:
 *
 *   [{ "id": "express", "reference": 0.93, "note": "why" }, ...]
 *
 * then run with `--reference path/to/grades.json`. The runner reports whether
 * it is using confirmed or provisional grades, and says so in its output, so a
 * result can never quietly rest on grades nobody checked.
 *
 * Two reviewers grading independently and comparing is better still: their
 * disagreement is the noise floor, and no pipeline can be meaningfully
 * separated from another by less than that.
 *
 * ## Choosing cases
 *
 * The set needs spread — a pipeline that only sees good repositories cannot be
 * shown to rank anything. It also needs at least one **adversarial** case: a
 * repository that looks better than it is. A polished README over a thin
 * implementation is the one that separates a system reading evidence from one
 * reading marketing.
 */

export type EvalCase = {
  id: string;
  repoUrl: string;
  projectTitle: string;
  claimedSkills: string[];
  /** Human grade, 0-1. */
  reference: number;
  /** Why this case is in the set and what it is meant to expose. */
  note: string;
  /** True until a human has graded it against the rubric above. */
  provisional: boolean;
  /** Marks a case chosen because it is misleading on the surface. */
  adversarial?: boolean;
};

/**
 * Starter set: public repositories spanning the bands. The library tier is
 * uncontroversial — these are widely used, heavily reviewed codebases. The
 * lower bands are deliberately left to the operator, because a good
 * tutorial-clone case is one you have opened and confirmed, and a stale link
 * to somebody's abandoned repository is worse than no case at all.
 *
 * Find lower-band cases with GitHub search, e.g.
 *   `todo app in:name created:>2024-01-01 stars:<3`
 *   `"following this tutorial" in:readme stars:<3`
 * then grade them and add them to your reference file.
 */
export const STARTER_CASES: EvalCase[] = [
  {
    id: "express",
    repoUrl: "https://github.com/expressjs/express",
    projectTitle: "Express — minimal web framework",
    claimedSkills: ["Node.js", "HTTP", "middleware design", "API design"],
    reference: 0.93,
    note: "Production tier. Extensive tests, long history, many contributors.",
    provisional: true,
  },
  {
    id: "flask",
    repoUrl: "https://github.com/pallets/flask",
    projectTitle: "Flask — Python web framework",
    claimedSkills: ["Python", "WSGI", "API design", "testing"],
    reference: 0.94,
    note: "Production tier, different language — checks the pipeline is not tuned to JS.",
    provisional: true,
  },
  {
    id: "zod",
    repoUrl: "https://github.com/colinhacks/zod",
    projectTitle: "Zod — TypeScript schema validation",
    claimedSkills: ["TypeScript", "type-level programming", "library design"],
    reference: 0.92,
    note: "Production tier, heavy type-level code — checks reading beyond the surface.",
    provisional: true,
  },
  {
    id: "hono",
    repoUrl: "https://github.com/honojs/hono",
    projectTitle: "Hono — web framework for edge runtimes",
    claimedSkills: ["TypeScript", "routing", "performance", "testing"],
    reference: 0.9,
    note: "Production tier, newer and smaller than Express — tests sensitivity to age and size.",
    provisional: true,
  },
  {
    id: "ky",
    repoUrl: "https://github.com/sindresorhus/ky",
    projectTitle: "Ky — HTTP client based on fetch",
    claimedSkills: ["TypeScript", "HTTP", "error handling"],
    reference: 0.88,
    note: "Small production library. A pipeline that rewards size alone will under-rate it.",
    provisional: true,
  },
  {
    id: "todomvc",
    repoUrl: "https://github.com/tastejs/todomvc",
    projectTitle: "TodoMVC — the same todo app in many frameworks",
    claimedSkills: ["JavaScript", "frontend frameworks", "application architecture"],
    reference: 0.55,
    note: "Adversarial. Well maintained and widely known, but by design it is the canonical tutorial app repeated many times. A pipeline reading reputation instead of code will over-rate it.",
    provisional: true,
    adversarial: true,
  },
];

export type LoadedCases = {
  cases: EvalCase[];
  /** False when any grade in use is still provisional. */
  confirmed: boolean;
  source: string;
};

/**
 * Loads the case set, applying a reference-grade file when one is given.
 * A case present in the reference file is treated as confirmed; anything left
 * on its provisional grade keeps that flag, and the runner reports it.
 */
export function loadCases(referencePath?: string): LoadedCases {
  if (!referencePath) {
    return { cases: STARTER_CASES, confirmed: false, source: "starter set (provisional grades)" };
  }
  const path = resolve(referencePath);
  if (!existsSync(path)) {
    throw new Error(`Reference file not found: ${path}`);
  }
  const raw = JSON.parse(readFileSync(path, "utf-8")) as Array<
    Partial<EvalCase> & { id: string; reference: number }
  >;
  const byId = new Map(raw.map((r) => [r.id, r]));

  // A reference file may both regrade starter cases and add new ones.
  const merged: EvalCase[] = STARTER_CASES.map((c) => {
    const override = byId.get(c.id);
    if (!override) return c;
    byId.delete(c.id);
    return { ...c, ...override, reference: override.reference, provisional: false };
  });

  for (const extra of byId.values()) {
    if (!extra.repoUrl) continue;
    merged.push({
      id: extra.id,
      repoUrl: extra.repoUrl,
      projectTitle: extra.projectTitle || extra.id,
      claimedSkills: extra.claimedSkills || [],
      reference: extra.reference,
      note: extra.note || "",
      provisional: false,
      adversarial: extra.adversarial,
    });
  }

  return {
    cases: merged,
    confirmed: merged.every((c) => !c.provisional),
    source: path,
  };
}
