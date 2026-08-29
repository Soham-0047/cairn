import { Types } from "mongoose";
import { EventEmitter } from "events";
import { getRouter } from "../llm/router.js";
import { PROJECT_EVAL_VISUAL_PROMPT } from "../llm/prompts.js";
import { Evaluation, EvaluationDoc } from "../models/Evaluation.js";
import { Credential } from "../models/Credential.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { sendCredentialIssued, sendEvalComplete } from "./email.service.js";
import { checkOriginality } from "./originality.service.js";
import { runRepoEvaluation, type WorkflowEvent } from "../agents/repo-eval/orchestrator.js";
import type { Part } from "../llm/types.js";

/**
 * Project evaluation.
 *
 * The work runs as an agentic workflow (see agents/repo-eval/orchestrator.ts):
 * an investigator with repository tools decides what evidence to gather, three
 * specialists judge it through separate lenses, and every claim is checked
 * against the source it cites before any of it reaches the user.
 *
 * Submission is asynchronous. The route creates the record and returns; the
 * run continues in the background and the client follows it over SSE. A run
 * that reads a dozen files and makes twenty model calls does not fit inside a
 * request timeout, and pretending otherwise is what produced the 502s this
 * replaces.
 */

export const evalEvents = new EventEmitter();
evalEvents.setMaxListeners(0);

/** What an SSE subscriber receives. `workflow` events carry the live detail. */
export type EvalProgressEvent =
  | {
      stage: number | "final";
      status: "running" | "complete" | "failed";
      label: string;
      score?: number;
      passed?: boolean;
      finalScore?: number;
    }
  | ({ stage: "workflow" } & WorkflowEvent);

function emit(evalId: string, event: EvalProgressEvent): void {
  evalEvents.emit(evalId, event);
}

export type EvaluateProjectInput = {
  userId: Types.ObjectId | string;
  repoUrl: string;
  projectTitle: string;
  projectType?: string;
  claimedSkills: string[];
  screenshots?: { label?: string; dataUrl: string }[];
  userAccessToken?: string;
};

/**
 * Creates the record and starts the run in the background.
 *
 * Returns as soon as the record exists so the client can navigate straight to
 * the results page and subscribe. Rejections here are configuration or input
 * problems; failures during the run are recorded on the document itself.
 */
export async function startEvaluation(input: EvaluateProjectInput): Promise<EvaluationDoc> {
  const evalDoc = await Evaluation.create({
    userId: input.userId,
    repoUrl: input.repoUrl,
    projectTitle: input.projectTitle,
    projectType: input.projectType || "general",
    claimedSkills: input.claimedSkills,
    screenshots: (input.screenshots || []).map((s) => ({
      label: s.label || "",
      dataUrl: s.dataUrl,
      visualFindings: "",
    })),
    status: "queued",
    pipeline: "agent",
  });

  // Deliberately not awaited. Every failure path inside writes its own status
  // to the document, so an unhandled rejection here would be a bug rather than
  // an expected outcome.
  void runEvaluation(String(evalDoc._id), input).catch((err) => {
    logger.error(
      { evalId: String(evalDoc._id), err: err instanceof Error ? err.message : String(err) },
      "evaluation runner escaped its own error handling",
    );
  });

  return evalDoc.toObject() as EvaluationDoc;
}

/** Runs the workflow and persists it. Safe to call directly (the harness does). */
export async function runEvaluation(
  evalId: string,
  input: EvaluateProjectInput,
): Promise<EvaluationDoc | null> {
  const evalDoc = await Evaluation.findById(evalId);
  if (!evalDoc) {
    logger.error({ evalId }, "evaluation record vanished before the run started");
    return null;
  }

  evalDoc.status = "running";
  await evalDoc.save();

  try {
    const outcome = await runRepoEvaluation({
      repoUrl: input.repoUrl,
      projectTitle: input.projectTitle,
      claimedSkills: input.claimedSkills,
      userAccessToken: input.userAccessToken,
      githubToken: env.GITHUB_TOKEN_FOR_PUBLIC_READS || undefined,
      // Fingerprinted from the files the agent read, so it costs no extra
      // GitHub reads. Degrades to null when the vector store is unset.
      originality: safeOriginality,
      visual: input.screenshots?.length
        ? () => reviewScreenshots(input.projectTitle, input.screenshots!)
        : undefined,
      emit: (e) => emit(evalId, { stage: "workflow", ...e }),
    });

    const { breakdown, verification, investigation, structural, specialists, review } = outcome;

    evalDoc.repoOwner = investigation.run.agent ? parseOwner(input.repoUrl) : "";
    evalDoc.repoName = parseName(input.repoUrl);

    evalDoc.set("stages", [
      {
        name: "Investigation",
        score: Math.min(1, investigation.filesRead.length / 10),
        summary: investigation.result.projectSummary,
        findings: investigation.result.evidence.map((e) => `[${e.kind}] ${e.claim} (${e.cite})`),
      },
      {
        name: "Structural signals",
        score: structural.score,
        summary: structural.summary,
        findings: structural.findings,
      },
      ...specialists.map((s) => ({
        name: `Review — ${labelFor(s.name)}`,
        score: s.score,
        summary: s.reasoning,
        findings: s.claims.map((c) => `[${c.polarity}] ${c.text} (${c.cite})`),
      })),
      {
        name: "Verification",
        score: verification.groundedness,
        summary: `${verification.supported.length} of ${verification.claims.length} claims were confirmed against the source they cite.`,
        findings: verification.dropped.map((c) => `DROPPED (${c.verdict}): ${c.text} — ${c.reason}`),
      },
    ]);

    evalDoc.set(
      "agentSteps",
      investigation.run.steps.map((s) => ({
      index: s.index,
      thought: s.thought,
      tool: s.tool || "",
      args: s.args || {},
      observation: (s.observation || "").slice(0, 4000),
      isError: !!s.isError,
      latencyMs: s.latencyMs,
      provider: s.provider || "",
        model: s.model || "",
      })),
    );
    evalDoc.set("filesRead", investigation.filesRead);
    evalDoc.set(
      "claims",
      verification.claims.map((c) => ({
      id: c.id,
      text: c.text,
      cite: c.cite,
      polarity: c.polarity,
      source: c.source,
      verdict: c.verdict,
        reason: c.reason,
      })),
    );
    evalDoc.groundedness = verification.groundedness;
    evalDoc.set(
      "scoreComponents",
      breakdown.components.map((c) => ({
      key: c.key,
      label: c.label,
      value: c.value,
      weight: c.weight,
      effectiveWeight: c.effectiveWeight,
      confidence: c.confidence || "",
        present: c.present,
      })),
    );
    evalDoc.shrinkage = breakdown.shrinkage;
    evalDoc.passReason = breakdown.passReason;
    evalDoc.verdictLine = review.verdictLine;
    evalDoc.set("modelsUsed", outcome.meta.modelsUsed);
    evalDoc.set("vulnerabilities", outcome.vulnerabilities);
    evalDoc.originalityFlagged = outcome.originalitySignal?.flagged ?? false;
    evalDoc.set("runCost", {
      llmCalls: outcome.meta.llmCalls,
      githubReads: outcome.meta.networkReads,
      agentBudgetUsed: investigation.run.budgetUsed,
      totalLatencyMs: outcome.meta.totalLatencyMs,
    });

    evalDoc.finalScore = breakdown.final;
    evalDoc.passed = breakdown.passed;
    evalDoc.feedback = review.feedback;
    evalDoc.set("strengths", review.strengths);
    evalDoc.set("improvements", review.improvements);
    evalDoc.status = "complete";
    await evalDoc.save();

    if (evalDoc.passed) await issueCredential(input, evalDoc, breakdown.final);

    emit(evalId, {
      stage: "final",
      status: "complete",
      label: "Complete",
      passed: evalDoc.passed,
      finalScore: evalDoc.finalScore,
    });

    notifyEmails(input, evalDoc).catch((err) =>
      logger.warn(
        { err: err instanceof Error ? err.message : String(err) },
        "email notification failed",
      ),
    );

    logger.info(
      {
        evalId,
        repo: input.repoUrl,
        finalScore: breakdown.final,
        passed: breakdown.passed,
        groundedness: verification.groundedness,
        filesRead: investigation.filesRead.length,
        llmCalls: outcome.meta.llmCalls,
        latencyMs: outcome.meta.totalLatencyMs,
      },
      "evaluation complete",
    );
    return evalDoc.toObject() as EvaluationDoc;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ evalId, err: msg, repo: input.repoUrl }, "evaluation failed");
    evalDoc.status = "failed";
    evalDoc.error = msg.slice(0, 500);
    await evalDoc.save();
    emit(evalId, { stage: "final", status: "failed", label: "Evaluation failed" });
    return evalDoc.toObject() as EvaluationDoc;
  }
}

/* ------------------------------ sub-stages ------------------------------ */

/**
 * Multimodal screenshot review. Unchanged in substance from the previous
 * pipeline, but now one weighted component among several rather than a bonus,
 * and it runs concurrently with the repository investigation.
 */
async function reviewScreenshots(
  projectTitle: string,
  screenshots: { label?: string; dataUrl: string }[],
): Promise<{ score: number } | null> {
  try {
    const parts: Part[] = [
      {
        type: "text",
        text: PROJECT_EVAL_VISUAL_PROMPT({
          projectTitle,
          textFindings: "Judge the screenshots on their own terms.",
        }),
      },
    ];
    for (const s of screenshots.slice(0, 4)) {
      const { base64, mimeType } = parseDataUrl(s.dataUrl);
      parts.push({ type: "image", base64, mimeType });
    }

    const { response } = await getRouter().call("evaluate_project_visual", {
      messages: [
        { role: "system", content: "You output strict JSON only." },
        { role: "user", content: parts },
      ],
      jsonSchema: { type: "object" },
      temperature: 0.2,
      maxTokens: 1024,
    });
    const c = response.content as unknown as { visualScore?: number };
    const score = typeof c?.visualScore === "number" ? c.visualScore : null;
    return score === null ? null : { score: Math.max(0, Math.min(1, score)) };
  } catch (err) {
    logger.warn(
      { err: err instanceof Error ? err.message : String(err) },
      "visual review unavailable; scoring without it",
    );
    return null;
  }
}

/**
 * Embedding-similarity check against known tutorial repositories, run over the
 * excerpts the agent gathered. Failure is not fatal: the originality specialist
 * still judges from the code, it just does so without this corroboration.
 */
async function safeOriginality(input: {
  readme: string;
  codeExcerpts: string;
  description: string;
}): Promise<{ score: number; flagged: boolean; reasoning: string; matches: string[] } | null> {
  try {
    const result = await checkOriginality(input);
    return {
      score: result.score,
      flagged: result.flagged,
      reasoning: result.reasoning,
      matches: result.matches.map((m) => `~${m.score.toFixed(2)} ${m.label || m.sourceUrl}`),
    };
  } catch (err) {
    logger.info(
      { err: err instanceof Error ? err.message : String(err) },
      "fingerprint check unavailable; the originality specialist will judge from code alone",
    );
    return null;
  }
}

async function issueCredential(
  input: EvaluateProjectInput,
  evalDoc: EvaluationDoc & { _id: Types.ObjectId },
  finalScore: number,
): Promise<void> {
  const issuedAt = new Date();
  const signature = Credential.signPayload({
    userId: String(input.userId),
    type: "project",
    title: input.projectTitle,
    issuedAt,
  });
  await Credential.create({
    userId: input.userId,
    type: "project",
    title: input.projectTitle,
    skills: input.claimedSkills,
    evidence: { repoUrl: input.repoUrl, evaluationId: evalDoc._id, score: finalScore },
    issuedAt,
    signature,
  });
}

async function notifyEmails(
  input: EvaluateProjectInput,
  evalDoc: EvaluationDoc & { _id: Types.ObjectId },
): Promise<void> {
  const { User } = await import("../models/User.js");
  const user = await User.findById(input.userId).lean();
  if (!user?.email) return;

  const portfolioUrl = `${env.FRONTEND_URL}/u/${user.handle}`;
  await sendEvalComplete(user.email, {
    passed: evalDoc.passed,
    score: evalDoc.finalScore,
    portfolioUrl,
    projectTitle: input.projectTitle,
  });
  if (evalDoc.passed) {
    await sendCredentialIssued(user.email, portfolioUrl, input.projectTitle);
  }
}

/* -------------------------------- helpers -------------------------------- */

function labelFor(name: string): string {
  return name === "skillMatch" ? "skill match" : name;
}

function parseOwner(url: string): string {
  return url.match(/github\.com[:/]([^/]+)\//i)?.[1] || "";
}

function parseName(url: string): string {
  return url.match(/github\.com[:/][^/]+\/([^/\s.]+)/i)?.[1] || "";
}

function parseDataUrl(dataUrl: string): { base64: string; mimeType: string } {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return { base64: dataUrl, mimeType: "image/jpeg" };
  return { mimeType: m[1]!, base64: m[2]! };
}
