import { Octokit } from "@octokit/rest";
import { getRouter } from "../llm/router.js";
import { PROJECT_EVAL_TEXT_PROMPT } from "../llm/prompts.js";
import { fetchRepoSnapshot, getDependencyVulnerabilities } from "../services/github.service.js";
import { createRepoContext } from "../agents/tools/repo.js";
import { verifyClaims, type Claim } from "../agents/repo-eval/verifier.js";
import { parseRepoUrl } from "../agents/repo-eval/orchestrator.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

/**
 * The baseline: the pipeline as it stood before the agentic workflow.
 *
 * Kept verbatim rather than reimplemented in a friendlier form, because the
 * comparison is only worth anything if the baseline is the thing that actually
 * shipped. It gets the same repositories, the same model chains, the same
 * free-tier budget and the same claim-verification pass — the single
 * difference is that the evidence is chosen by a fixed rule instead of by an
 * agent, and no claim is checked before it is scored.
 *
 * The fixed rule is the interesting part: the first six code files in
 * alphabetical tree order, truncated to 2000 characters each.
 */

export type BaselineResult = {
  finalScore: number;
  passed: boolean;
  scores: { functionality: number; originality: number; quality: number; skillMatch: number };
  feedback: string;
  strengths: string[];
  improvements: string[];
  /** Files the fixed rule selected, for side-by-side comparison with the agent's. */
  filesRead: string[];
  claims: Claim[];
  groundedness: number;
  llmCalls: number;
  githubReads: number;
  latencyMs: number;
  provider?: string;
  model?: string;
};

export async function runBaseline(params: {
  repoUrl: string;
  projectTitle: string;
  claimedSkills: string[];
  githubToken?: string;
  /** Runs the same verifier over the baseline's claims, for a fair groundedness number. */
  verify?: boolean;
}): Promise<BaselineResult> {
  const started = Date.now();
  const snapshot = await fetchRepoSnapshot(params.repoUrl, params.githubToken);
  const vulns = await getDependencyVulnerabilities(snapshot.owner, snapshot.repo, params.githubToken);

  const { response, trace } = await getRouter().call("evaluate_project", {
    messages: [
      { role: "system", content: "You output strict JSON only. No prose." },
      {
        role: "user",
        content: PROJECT_EVAL_TEXT_PROMPT({
          projectTitle: params.projectTitle,
          claimedSkills: params.claimedSkills,
          readme: snapshot.readme,
          fileTree: snapshot.fileTree,
          codeExcerpts: snapshot.codeExcerpts,
          vulnerabilities: vulns,
        }),
      },
    ],
    jsonSchema: { type: "object" },
    temperature: 0.2,
    maxTokens: 4096,
  });

  const parsed = coerce(response.content) || {};
  const scores = {
    functionality: clamp01(Number(parsed?.scores?.functionality)),
    originality: clamp01(Number(parsed?.scores?.originality)),
    quality: clamp01(Number(parsed?.scores?.quality)),
    skillMatch: clamp01(Number(parsed?.scores?.skillMatch)),
  };

  const structural = scoreStructuralLegacy(snapshot);
  // The original weighting, flat bonus and all. Reproduced rather than
  // corrected: fixing the baseline's scoring would hide part of the
  // improvement the new aggregation is responsible for.
  const overall = clamp01(Number(parsed?.overall));
  const finalScore = round2(structural * 0.2 + overall * 0.65 + 0.15 * 0.6);

  const strengths = strArray(parsed?.strengths);
  const improvements = strArray(parsed?.improvements);

  // The baseline emits prose, not citations. To measure groundedness on the
  // same footing, each statement is treated as a claim and matched against the
  // files the baseline actually saw — which is exactly the check it never did.
  const claims: Claim[] = [
    ...strengths.map((text, i) => ({
      id: `base-s-${i}`,
      text,
      cite: extractCite(text),
      polarity: "positive" as const,
      source: "baseline",
    })),
    ...improvements.map((text, i) => ({
      id: `base-i-${i}`,
      text,
      cite: extractCite(text),
      polarity: "negative" as const,
      source: "baseline",
    })),
  ];

  let groundedness = 0;
  if (params.verify && claims.length) {
    const { owner, repo } = parseRepoUrl(params.repoUrl);
    const octokit = new Octokit({ auth: params.githubToken || env.GITHUB_TOKEN_FOR_PUBLIC_READS || undefined });
    const ctx = await createRepoContext({ owner, repo, ref: snapshot.defaultBranch, octokit });
    // Seed the context with exactly the excerpts the baseline was given, so
    // the verifier judges against the baseline's own evidence and not against
    // material it never had.
    for (const block of snapshot.codeExcerpts.split(/\n(?=--- )/)) {
      const m = block.match(/^--- (.+?) ---\n([\s\S]*)$/);
      if (m) {
        ctx.blobs.set(m[1]!, m[2]!);
        ctx.ledger.set(m[1]!, m[2]!.split("\n").length);
      }
    }
    const report = await verifyClaims(claims, ctx);
    groundedness = report.groundedness;
    for (const c of report.claims) {
      const target = claims.find((x) => x.id === c.id);
      if (target) Object.assign(target, { verdict: c.verdict, reason: c.reason });
    }
  }

  const result: BaselineResult = {
    finalScore,
    passed: finalScore >= 0.65 && scores.originality >= 0.55,
    scores,
    feedback: typeof parsed?.feedback === "string" ? parsed.feedback : "",
    strengths,
    improvements,
    filesRead: snapshot.codeExcerpts
      .split("\n")
      .filter((l) => l.startsWith("--- "))
      .map((l) => l.replace(/^--- | ---$/g, "")),
    claims,
    groundedness,
    llmCalls: 1,
    githubReads: 9, // repo + readme + commits + tree + up to 6 file reads
    latencyMs: Date.now() - started,
    provider: trace.finalProvider,
    model: trace.finalModel,
  };
  logger.info(
    { repo: params.repoUrl, finalScore, files: result.filesRead.length },
    "baseline run complete",
  );
  return result;
}

/** The original structural heuristic, unchanged. */
function scoreStructuralLegacy(snap: {
  readme: string;
  fileTree: string;
  commitCount: number;
  uniqueAuthors: number;
}): number {
  let score = 0;
  if (snap.readme.length > 200) score += 0.25;
  if (snap.commitCount >= 5) score += 0.25;
  else if (snap.commitCount > 0) score += 0.1;
  if (/test|spec/i.test(snap.fileTree)) score += 0.2;
  if (snap.fileTree.split("\n").length >= 10) score += 0.2;
  if (snap.uniqueAuthors === 1) score += 0.1;
  return Math.max(0, Math.min(1, score));
}

/** Pulls a `path.ext:line` reference out of free prose, when one is present. */
function extractCite(text: string): string {
  const m = text.match(/([\w./-]+\.\w{1,5})(?::(\d+))?/);
  return m ? (m[2] ? `${m[1]}:${m[2]}` : m[1]!) : "";
}

function strArray(v: unknown): string[] {
  return Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string").map((s) => s.trim()).filter(Boolean)
    : [];
}

function clamp01(n: number): number {
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function coerce(content: unknown): any {
  if (content && typeof content === "object") return content;
  if (typeof content === "string") {
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
  return null;
}
