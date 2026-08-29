import { Octokit } from "@octokit/rest";
import { getRouter } from "../../llm/router.js";
import { logger } from "../../utils/logger.js";
import { getDependencyVulnerabilities, type VulnSummary } from "../../services/github.service.js";
import { createRepoContext, visibleFiles, type RepoToolContext } from "../tools/repo.js";
import { investigateRepo, type Investigation } from "./investigator.js";
import { runSpecialists, type SpecialistResult } from "./specialists.js";
import { verifyClaims, type Claim, type VerificationReport } from "./verifier.js";
import { aggregate, type ScoreBreakdown } from "./scoring.js";
import { SYNTHESIS_GOAL, SYNTHESIS_SYSTEM } from "./prompts.js";
import type { AgentStep } from "../types.js";

/**
 * The repo-evaluation workflow.
 *
 *   investigate (tool-using, chooses its own evidence)
 *        ↓
 *   structural signals (deterministic, computed from the repo itself)
 *        ↓
 *   three specialists in parallel, one lens each
 *        ↓
 *   verify every claim against the source it cites — unsupported claims are dropped
 *        ↓
 *   aggregate, shrinking toward the deterministic anchor when verification was weak
 *        ↓
 *   synthesise the review from surviving claims only
 *
 * Each stage is a separate router task, so the model chain behind each one is
 * tunable independently: the investigator needs a model that follows a
 * protocol over many turns, the verifier needs a cheap strict one, and
 * synthesis needs the best writer available.
 */

export type WorkflowPhase =
  | "investigate"
  | "structural"
  | "specialists"
  | "verify"
  | "synthesize";

export type WorkflowEvent =
  | { type: "phase"; phase: WorkflowPhase; status: "running" | "complete" | "failed"; label: string; detail?: string }
  | { type: "tool"; step: number; tool: string; args: Record<string, unknown>; thought: string; ok: boolean }
  | { type: "specialist"; name: string; score: number; confidence: string }
  | { type: "verdict"; supported: number; dropped: number; groundedness: number }
  | { type: "score"; final: number; passed: boolean };

export type RepoEvalOutcome = {
  investigation: Investigation;
  structural: { score: number; findings: string[]; summary: string };
  specialists: SpecialistResult[];
  verification: VerificationReport;
  breakdown: ScoreBreakdown;
  review: {
    feedback: string;
    strengths: string[];
    improvements: string[];
    verdictLine: string;
  };
  vulnerabilities: VulnSummary;
  originalitySignal: { score: number; flagged: boolean; reasoning: string; matches: string[] } | null;
  meta: {
    filesRead: string[];
    networkReads: number;
    llmCalls: number;
    totalLatencyMs: number;
    modelsUsed: Array<{ stage: string; provider: string; model: string; latencyMs: number }>;
  };
};

export async function runRepoEvaluation(params: {
  repoUrl: string;
  projectTitle: string;
  claimedSkills: string[];
  userAccessToken?: string;
  githubToken?: string;
  /**
   * Deterministic originality evidence (embedding similarity against a corpus
   * of known tutorial repositories). Given as a callback rather than a value so
   * it can be fingerprinted from the files the agent actually opened, instead
   * of refetching the repository through a second, shallower code path.
   *
   * Its output is passed to the originality specialist as evidence rather than
   * used directly: one similarity measurement should not by itself condemn a
   * project, and the specialist can weigh it against the code.
   */
  originality?: (input: {
    readme: string;
    codeExcerpts: string;
    description: string;
  }) => Promise<{ score: number; flagged: boolean; reasoning: string; matches: string[] } | null>;
  /**
   * Multimodal screenshot review. Started concurrently with the investigation
   * (the two read different evidence) and awaited before aggregation.
   */
  visual?: () => Promise<{ score: number } | null>;
  budget?: number;
  maxSteps?: number;
  emit?: (e: WorkflowEvent) => void;
}): Promise<RepoEvalOutcome> {
  const startedAt = Date.now();
  const emit = params.emit ?? (() => {});
  const { owner, repo } = parseRepoUrl(params.repoUrl);
  const octokit = new Octokit({ auth: params.userAccessToken || params.githubToken || undefined });
  const modelsUsed: RepoEvalOutcome["meta"]["modelsUsed"] = [];
  let llmCalls = 0;

  // Kicked off before anything else: it depends on the screenshots, not on the
  // repository, so its latency overlaps the whole workflow instead of adding to it.
  const visualPromise = params.visual ? params.visual().catch(() => null) : Promise.resolve(null);

  const repoInfo = await octokit.repos.get({ owner, repo });
  const ref = repoInfo.data.default_branch;
  const ctx = await createRepoContext({ octokit, owner, repo, ref });

  let readme = "";
  try {
    const r = await octokit.repos.getReadme({ owner, repo });
    readme = Buffer.from(r.data.content, r.data.encoding as BufferEncoding).toString("utf-8");
    ctx.reads++;
  } catch {
    readme = "";
  }

  // ---------- Phase 1: investigation ----------
  emit({ type: "phase", phase: "investigate", status: "running", label: "Investigating repository" });
  const investigation = await investigateRepo({
    ctx,
    projectTitle: params.projectTitle,
    claimedSkills: params.claimedSkills,
    description: repoInfo.data.description || "",
    readme,
    budget: params.budget,
    maxSteps: params.maxSteps,
    onStep: (step: AgentStep) => {
      if (!step.tool) return;
      emit({
        type: "tool",
        step: step.index,
        tool: step.tool,
        args: step.args || {},
        thought: step.thought,
        ok: !step.isError,
      });
    },
  });
  llmCalls += investigation.run.steps.length;
  const invModel = investigation.run.steps.find((s) => s.model);
  if (invModel) {
    modelsUsed.push({
      stage: "Investigation",
      provider: invModel.provider || "",
      model: invModel.model || "",
      latencyMs: investigation.run.totalLatencyMs,
    });
  }
  emit({
    type: "phase",
    phase: "investigate",
    status: investigation.run.stoppedBecause === "error" ? "failed" : "complete",
    label: "Investigating repository",
    detail: `${investigation.filesRead.length} file(s) read, ${investigation.result.evidence.length} finding(s)`,
  });

  // Fingerprinted against what the agent chose to read. Those files are the
  // ones that characterise the project, so this is both cheaper and a better
  // signal than the fixed sample the previous pipeline used.
  const originalitySignal = params.originality
    ? await params.originality({
        readme,
        codeExcerpts: [...ctx.blobs.entries()]
          .map(([path, text]) => `--- ${path} ---\n${text.slice(0, 2000)}`)
          .join("\n\n"),
        description: params.projectTitle,
      }).catch(() => null)
    : null;

  // ---------- Phase 2: structural signals ----------
  emit({ type: "phase", phase: "structural", status: "running", label: "Structural signals" });
  const vulnerabilities = await getDependencyVulnerabilities(owner, repo, params.userAccessToken);
  const structural = scoreStructural({
    ctx,
    readme,
    investigation,
    originalitySignal,
    vulns: vulnerabilities,
    repoInfo: {
      createdAt: repoInfo.data.created_at,
      updatedAt: repoInfo.data.updated_at,
    },
  });
  emit({
    type: "phase",
    phase: "structural",
    status: "complete",
    label: "Structural signals",
    detail: `${structural.score.toFixed(2)}`,
  });

  // ---------- Phase 3: specialists ----------
  emit({ type: "phase", phase: "specialists", status: "running", label: "Specialist review" });
  const specialists = await runSpecialists({
    investigation: investigation.result,
    ctx,
    claimedSkills: params.claimedSkills,
    projectTitle: params.projectTitle,
    originalitySignal,
    onDone: (r) =>
      emit({ type: "specialist", name: r.name, score: r.score, confidence: r.confidence }),
  });
  llmCalls += specialists.length;
  for (const s of specialists) {
    if (s.model) {
      modelsUsed.push({
        stage: `Review — ${s.name}`,
        provider: s.provider || "",
        model: s.model,
        latencyMs: s.latencyMs,
      });
    }
  }
  emit({ type: "phase", phase: "specialists", status: "complete", label: "Specialist review" });

  // ---------- Phase 4: verification ----------
  emit({ type: "phase", phase: "verify", status: "running", label: "Verifying claims" });
  const claims = collectClaims(investigation, specialists);
  const verification = await verifyClaims(claims, ctx);
  llmCalls += verification.llmCalls;
  emit({
    type: "verdict",
    supported: verification.supported.length,
    dropped: verification.dropped.length,
    groundedness: verification.groundedness,
  });
  emit({
    type: "phase",
    phase: "verify",
    status: "complete",
    label: "Verifying claims",
    detail: `${verification.supported.length}/${verification.claims.length} claims held up`,
  });

  // ---------- Phase 5: aggregate + synthesise ----------
  emit({ type: "phase", phase: "synthesize", status: "running", label: "Writing the review" });
  const visual = await visualPromise;
  const breakdown = aggregate({
    structural: structural.score,
    specialists,
    visual: visual ? visual.score : null,
    groundedness: verification.groundedness,
  });

  const review = await synthesize({
    title: params.projectTitle,
    owner,
    repo,
    claimedSkills: params.claimedSkills,
    investigation: investigation.result,
    specialists,
    verification,
    structural,
  });
  llmCalls += 1;
  if (review.provider) {
    modelsUsed.push({
      stage: "Synthesis",
      provider: review.provider,
      model: review.model || "",
      latencyMs: review.latencyMs,
    });
  }
  emit({ type: "phase", phase: "synthesize", status: "complete", label: "Writing the review" });
  emit({ type: "score", final: breakdown.final, passed: breakdown.passed });

  return {
    investigation,
    structural,
    specialists,
    verification,
    breakdown,
    review: {
      feedback: review.feedback,
      strengths: review.strengths,
      improvements: review.improvements,
      verdictLine: review.verdictLine,
    },
    vulnerabilities,
    originalitySignal,
    meta: {
      filesRead: investigation.filesRead,
      networkReads: ctx.reads,
      llmCalls,
      totalLatencyMs: Date.now() - startedAt,
      modelsUsed,
    },
  };
}

/* ---------------------------- claim collection ---------------------------- */

/**
 * Every statement that could reach the user, flattened into one list with a
 * stable id so verdicts can be matched back. Investigator evidence is included
 * alongside specialist claims — the investigation is where fabricated file
 * paths originate, so exempting it would leave the biggest hole unchecked.
 */
function collectClaims(investigation: Investigation, specialists: SpecialistResult[]): Claim[] {
  const claims: Claim[] = [];
  investigation.result.evidence.forEach((e, i) => {
    claims.push({
      id: `inv-${i}`,
      text: e.claim,
      cite: e.cite,
      polarity: e.kind === "strength" ? "positive" : e.kind === "concern" ? "negative" : "neutral",
      source: "investigator",
    });
  });
  for (const s of specialists) {
    s.claims.forEach((c, i) => {
      claims.push({
        id: `${s.name}-${i}`,
        text: c.text,
        cite: c.cite,
        polarity: c.polarity,
        source: s.name,
      });
    });
  }
  return claims;
}

/* ------------------------------- synthesis ------------------------------- */

async function synthesize(p: {
  title: string;
  owner: string;
  repo: string;
  claimedSkills: string[];
  investigation: { projectSummary: string };
  specialists: SpecialistResult[];
  verification: VerificationReport;
  structural: { score: number; findings: string[] };
}): Promise<{
  feedback: string;
  strengths: string[];
  improvements: string[];
  verdictLine: string;
  provider?: string;
  model?: string;
  latencyMs: number;
}> {
  const started = Date.now();
  const router = getRouter();
  const scores = Object.fromEntries(
    p.specialists.map((s) => [
      s.name,
      { score: s.score, confidence: s.confidence, reasoning: s.reasoning },
    ]),
  );

  try {
    const { response, trace } = await router.call("synthesize_review", {
      messages: [
        { role: "system", content: SYNTHESIS_SYSTEM },
        {
          role: "user",
          content: SYNTHESIS_GOAL({
            title: p.title,
            owner: p.owner,
            repo: p.repo,
            claimedSkills: p.claimedSkills,
            projectSummary: p.investigation.projectSummary,
            scores,
            verifiedClaims: p.verification.supported.map((c) => ({
              text: c.text,
              cite: c.cite,
              polarity: c.polarity,
            })),
            droppedCount: p.verification.dropped.length,
            structural: p.structural,
          }),
        },
      ],
      jsonSchema: { type: "object" },
      temperature: 0.35,
      maxTokens: 1536,
      validate: (content) => {
        const c = coerce(content);
        const inner = (c?.final ?? c) as Record<string, unknown> | null;
        if (!inner) return "non-JSON response";
        return typeof inner.feedback === "string" && inner.feedback.trim().length > 30
          ? null
          : "feedback missing or too short";
      },
    });
    const raw = coerce(response.content);
    const inner = (raw?.final ?? raw) as Record<string, any>;
    return {
      feedback: String(inner?.feedback || "").trim(),
      strengths: strArray(inner?.strengths),
      improvements: strArray(inner?.improvements),
      verdictLine: String(inner?.verdictLine || "").trim(),
      provider: trace.finalProvider,
      model: trace.finalModel,
      latencyMs: Date.now() - started,
    };
  } catch (err) {
    // Fall back to the verified claims themselves. They are already specific
    // and already checked — a plain list of them is a worse read than a
    // written review, but it is honest and it is never empty.
    logger.warn(
      { err: err instanceof Error ? err.message : String(err) },
      "synthesis failed; falling back to verified claims",
    );
    return {
      feedback:
        "The written summary could not be generated, so this report lists the verified findings directly. Each one was checked against the source it cites.",
      strengths: p.verification.supported
        .filter((c) => c.polarity === "positive")
        .map((c) => `${c.text} (${c.cite})`)
        .slice(0, 6),
      improvements: p.verification.supported
        .filter((c) => c.polarity === "negative")
        .map((c) => `${c.text} (${c.cite})`)
        .slice(0, 6),
      verdictLine: "",
      latencyMs: Date.now() - started,
    };
  }
}

/* --------------------------- structural signals --------------------------- */

/**
 * Deterministic signals, computed from the repository rather than asked of a
 * model. This is the anchor the final score falls back toward when claims do
 * not verify, so nothing here may depend on model output.
 */
export function scoreStructural(p: {
  ctx: RepoToolContext;
  readme: string;
  investigation: Investigation;
  originalitySignal?: { score: number; flagged: boolean; matches: string[] } | null;
  vulns?: VulnSummary;
  repoInfo?: { createdAt: string; updatedAt: string };
}): { score: number; findings: string[]; summary: string } {
  const findings: string[] = [];
  const files = visibleFiles(p.ctx);
  let score = 0;

  // README substance — measured in words, since a wall of badges is not depth.
  const readmeWords = p.readme.split(/\s+/).filter(Boolean).length;
  if (readmeWords >= 300) {
    score += 0.2;
    findings.push(`README has ${readmeWords} words — documented`);
  } else if (readmeWords >= 80) {
    score += 0.1;
    findings.push(`README has ${readmeWords} words — brief`);
  } else {
    findings.push(readmeWords === 0 ? "No README" : `README has only ${readmeWords} words`);
  }

  // Test files, by path convention — cheap and reliable across ecosystems.
  const testFiles = files.filter((f) =>
    /(^|\/)(tests?|__tests__|spec)\//i.test(f.path) || /\.(test|spec)\.\w+$/i.test(f.path),
  );
  if (testFiles.length >= 3) {
    score += 0.2;
    findings.push(`${testFiles.length} test files`);
  } else if (testFiles.length > 0) {
    score += 0.08;
    findings.push(`${testFiles.length} test file(s) — thin coverage`);
  } else {
    findings.push("No test files found");
  }

  // Size, on a curve. A 400-file repo is not twice as credible as a 200-file
  // one, so this saturates rather than scaling linearly.
  const codeFiles = files.filter((f) =>
    /\.(ts|tsx|js|jsx|py|go|rs|java|kt|rb|php|cs|swift|cpp|c|h|scala|ex|clj)$/i.test(f.path),
  );
  const sizeScore = Math.min(0.2, Math.log10(Math.max(1, codeFiles.length)) * 0.1);
  score += sizeScore;
  findings.push(`${codeFiles.length} source file(s)`);

  // Commit history, from the tool the agent already called when available.
  const history = Object.entries(p.investigation.run.observations).find(([k]) =>
    k.endsWith(":read_history"),
  )?.[1] as { count?: number; authors?: number; spanDays?: number } | undefined;
  if (history?.count) {
    if (history.count >= 20 && (history.spanDays ?? 0) >= 7) {
      score += 0.25;
      findings.push(`${history.count} commits over ${history.spanDays} days — sustained work`);
    } else if (history.count >= 5) {
      score += 0.12;
      findings.push(`${history.count} commits over ${history.spanDays ?? 0} days`);
    } else {
      findings.push(`Only ${history.count} commit(s) — looks like a bulk upload`);
    }
  } else {
    findings.push("Commit history not examined");
  }

  // Project hygiene: a lockfile, CI config or containerisation each indicate
  // the author thought about how this runs somewhere other than their laptop.
  const hygiene = [
    { rx: /(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|poetry\.lock|Cargo\.lock|go\.sum)$/, label: "dependency lockfile" },
    { rx: /(^|\/)\.github\/workflows\//, label: "CI workflow" },
    { rx: /(Dockerfile|docker-compose\.ya?ml)$/i, label: "container config" },
  ].filter((h) => p.ctx.tree.some((n) => h.rx.test(n.path)));
  if (hygiene.length) {
    score += Math.min(0.15, hygiene.length * 0.05);
    findings.push(`Has ${hygiene.map((h) => h.label).join(", ")}`);
  }

  // Dependabot alerts deduct, capped so one bad transitive dependency cannot
  // sink an otherwise solid project.
  if (p.vulns?.available) {
    if (p.vulns.total === 0) {
      findings.push("0 known dependency vulnerabilities");
    } else {
      const penalty = Math.min(0.2, p.vulns.critical * 0.1 + p.vulns.high * 0.05);
      score -= penalty;
      findings.push(
        `${p.vulns.total} open Dependabot alert(s): ${p.vulns.critical} critical, ${p.vulns.high} high, ${p.vulns.medium} medium, ${p.vulns.low} low`,
      );
    }
  }

  // Embedding similarity against known tutorial repositories. Reported as a
  // finding and never scored here — the originality specialist owns that
  // judgement, and this is one of its inputs.
  if (p.originalitySignal) {
    findings.push(
      p.originalitySignal.flagged
        ? `Fingerprint similarity ${p.originalitySignal.score.toFixed(2)} to known tutorial repositories: ${p.originalitySignal.matches.slice(0, 2).join("; ") || "unnamed matches"}`
        : `No close fingerprint match to known tutorial repositories (${p.originalitySignal.score.toFixed(2)})`,
    );
  }

  return {
    score: Math.max(0, Math.min(1, score)),
    findings,
    summary:
      "Computed from the repository itself — README depth, test files, source size, commit history, project hygiene and known vulnerabilities. No model input.",
  };
}

/* --------------------------------- utils --------------------------------- */

export function parseRepoUrl(url: string): { owner: string; repo: string } {
  const m = url.match(/github\.com[:/]([^/]+)\/([^/\s.]+)(?:\.git)?\/?$/i);
  if (!m) throw new Error(`Not a GitHub repo URL: ${url}`);
  return { owner: m[1]!, repo: m[2]! };
}

function strArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8);
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
