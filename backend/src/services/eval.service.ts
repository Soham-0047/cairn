import { Types } from "mongoose";
import { EventEmitter } from "events";
import { getRouter } from "../llm/router.js";
import { PROJECT_EVAL_TEXT_PROMPT, PROJECT_EVAL_VISUAL_PROMPT } from "../llm/prompts.js";
import { Evaluation, EvaluationDoc } from "../models/Evaluation.js";
import { Credential } from "../models/Credential.js";
import { fetchRepoSnapshot, getDependencyVulnerabilities, type VulnSummary } from "./github.service.js";
import { logger } from "../utils/logger.js";
import { sendCredentialIssued, sendEvalComplete } from "./email.service.js";
import type { Part } from "../llm/types.js";

/**
 * Process-local emitter that fans out per-evaluation stage updates to any SSE
 * subscribers. Keyed by `String(evalDoc._id)`. Listeners get one event per
 * stage transition (`running` → `complete`) plus a final synthesis event.
 */
export const evalEvents = new EventEmitter();
evalEvents.setMaxListeners(0);

export type EvalProgressEvent =
  | { stage: number | "final"; status: "running" | "complete" | "failed"; label: string; score?: number; passed?: boolean; finalScore?: number };

function emitProgress(evalId: string, event: EvalProgressEvent): void {
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

type TextEvalResult = {
  scores: {
    functionality: number;
    originality: number;
    quality: number;
    skillMatch: number;
  };
  overall: number;
  passed: boolean;
  strengths: string[];
  improvements: string[];
  feedback: string;
  tutorialCloneSignals: string[];
};

type VisualEvalResult = {
  visualScore: number;
  uiCohesion: "high" | "medium" | "low";
  polishLevel: "shipped" | "demo" | "prototype";
  findings: string[];
  matchesCodeClaims: boolean;
  summary: string;
};

/**
 * Multi-stage project evaluator.
 *
 * Stage 1: Structural heuristics (deterministic, no LLM)
 * Stage 2: Text-based code review (Gemma 4 27B)
 * Stage 3: Multimodal visual review (Gemma 4 12B with screenshots) — HERO
 * Stage 4: Synthesis + credential issuance
 *
 * The whole pipeline is wired through the router so different Gemma 4 variants
 * are used per stage — that "three models, three jobs" story is the hackathon
 * judging hook.
 */
export async function evaluateProject(input: EvaluateProjectInput): Promise<EvaluationDoc> {
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
    status: "running",
  });

  const evalId = String(evalDoc._id);
  try {
    // ---------- Stage 1: Structural heuristics ----------
    emitProgress(evalId, { stage: 1, status: "running", label: "Structural analysis" });
    const snapshot = await fetchRepoSnapshot(input.repoUrl, input.userAccessToken);

    // Vulnerability scan via Dependabot — degrades silently if disabled.
    const vulns = await getDependencyVulnerabilities(
      snapshot.owner,
      snapshot.repo,
      input.userAccessToken,
    );
    const structural = scoreStructural(snapshot, vulns);
    evalDoc.vulnerabilities = vulns;
    evalDoc.stages.push({
      name: "Structural",
      score: structural.score,
      summary: structural.summary,
      findings: structural.findings,
    });
    evalDoc.repoOwner = snapshot.owner;
    evalDoc.repoName = snapshot.repo;
    emitProgress(evalId, {
      stage: 1,
      status: "complete",
      label: "Structural analysis",
      score: structural.score,
    });

    // ---------- Stage 2: Text-based code review (Gemma 4 27B) ----------
    emitProgress(evalId, { stage: 2, status: "running", label: "Code review" });
    const router = getRouter();
    const textStart = Date.now();
    const { response: textRes, trace: textTrace } = await router.call("evaluate_project", {
      messages: [
        { role: "system", content: "You output strict JSON only. No prose." },
        {
          role: "user",
          content: PROJECT_EVAL_TEXT_PROMPT({
            projectTitle: input.projectTitle,
            claimedSkills: input.claimedSkills,
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

    const textResult = textRes.content as unknown as TextEvalResult;
    evalDoc.stages.push({
      name: "Code review",
      score: clamp01(textResult.overall),
      summary: textResult.feedback,
      findings: [...(textResult.strengths || []), ...(textResult.tutorialCloneSignals || [])],
    });
    evalDoc.modelsUsed.push({
      stage: "Code review",
      provider: textTrace.finalProvider || "",
      model: textTrace.finalModel || "",
      latencyMs: Date.now() - textStart,
    });
    emitProgress(evalId, {
      stage: 2,
      status: "complete",
      label: "Code review",
      score: clamp01(textResult.overall),
    });

    // ---------- Stage 3: Multimodal visual review (Gemma 4 12B) ----------
    let visualResult: VisualEvalResult | null = null;
    if (input.screenshots && input.screenshots.length > 0) {
      emitProgress(evalId, { stage: 3, status: "running", label: "Visual review" });
      const parts: Part[] = [
        {
          type: "text",
          text: PROJECT_EVAL_VISUAL_PROMPT({
            projectTitle: input.projectTitle,
            textFindings: textResult.feedback,
          }),
        },
      ];
      for (const s of input.screenshots.slice(0, 4)) {
        const { base64, mimeType } = parseDataUrl(s.dataUrl);
        parts.push({ type: "image", base64, mimeType });
      }

      const visStart = Date.now();
      const { response: visRes, trace: visTrace } = await router.call("evaluate_project_visual", {
        messages: [
          { role: "system", content: "You output strict JSON only." },
          { role: "user", content: parts },
        ],
        jsonSchema: { type: "object" },
        temperature: 0.2,
        maxTokens: 1024,
      });
      visualResult = visRes.content as unknown as VisualEvalResult;
      evalDoc.stages.push({
        name: "Visual review",
        score: clamp01(visualResult.visualScore),
        summary: visualResult.summary,
        findings: visualResult.findings || [],
      });
      evalDoc.modelsUsed.push({
        stage: "Visual review",
        provider: visTrace.finalProvider || "",
        model: visTrace.finalModel || "",
        latencyMs: Date.now() - visStart,
      });
      // Attach per-screenshot summary
      for (let i = 0; i < (evalDoc.screenshots?.length || 0); i++) {
        const s = evalDoc.screenshots[i];
        if (s) s.visualFindings = visualResult.findings?.[i] || visualResult.summary;
      }
      emitProgress(evalId, {
        stage: 3,
        status: "complete",
        label: "Visual review",
        score: clamp01(visualResult.visualScore),
      });
    }

    // ---------- Stage 4: Synthesis ----------
    emitProgress(evalId, { stage: 4, status: "running", label: "Synthesis" });
    const finalScore = synthesize(structural.score, textResult, visualResult);
    evalDoc.finalScore = finalScore;
    evalDoc.passed = finalScore >= 0.65 && textResult.scores.originality >= 0.55;
    evalDoc.feedback = textResult.feedback;
    evalDoc.strengths = textResult.strengths || [];
    evalDoc.improvements = textResult.improvements || [];
    evalDoc.status = "complete";
    await evalDoc.save();

    // Issue credential if passed
    if (evalDoc.passed) {
      const issuedAt = new Date();
      const userIdStr = String(input.userId);
      const signature = Credential.signPayload({
        userId: userIdStr,
        type: "project",
        title: input.projectTitle,
        issuedAt,
      });
      await Credential.create({
        userId: input.userId,
        type: "project",
        title: input.projectTitle,
        skills: input.claimedSkills,
        evidence: {
          repoUrl: input.repoUrl,
          evaluationId: evalDoc._id,
          score: finalScore,
        },
        issuedAt,
        signature,
      });
    }

    emitProgress(evalId, {
      stage: "final",
      status: "complete",
      label: "Synthesis",
      passed: evalDoc.passed,
      finalScore: evalDoc.finalScore,
    });

    // Email notifications — best-effort; never block the response.
    notifyEmails(input, evalDoc).catch((err) =>
      logger.warn(
        { err: err instanceof Error ? err.message : String(err) },
        "Email notification failed",
      ),
    );

    logger.info(
      { userId: input.userId, repo: input.repoUrl, finalScore, passed: evalDoc.passed },
      "Evaluation complete",
    );
    return evalDoc.toObject() as EvaluationDoc;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ err: msg, repo: input.repoUrl }, "Evaluation failed");
    evalDoc.status = "failed";
    evalDoc.error = msg.slice(0, 500);
    await evalDoc.save();
    emitProgress(evalId, {
      stage: "final",
      status: "failed",
      label: "Synthesis",
    });
    return evalDoc.toObject() as EvaluationDoc;
  }
}

async function notifyEmails(
  input: EvaluateProjectInput,
  evalDoc: EvaluationDoc & { _id: Types.ObjectId },
): Promise<void> {
  // Lazy import to avoid pulling Mongo deps at module-load
  const { User } = await import("../models/User.js");
  const user = await User.findById(input.userId).lean();
  if (!user?.email) return;

  const frontendBase = process.env.FRONTEND_URL || "http://localhost:3000";
  const portfolioUrl = `${frontendBase}/u/${user.handle}`;
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

function scoreStructural(
  snap: {
    readme: string;
    fileTree: string;
    commitCount: number;
    uniqueAuthors: number;
  },
  vulns?: VulnSummary,
) {
  const findings: string[] = [];
  let score = 0;

  if (snap.readme.length > 200) {
    score += 0.25;
    findings.push("README is substantive");
  } else {
    findings.push("README is thin");
  }

  if (snap.commitCount >= 5) {
    score += 0.25;
    findings.push(`${snap.commitCount} commits — incremental work`);
  } else if (snap.commitCount > 0) {
    score += 0.1;
    findings.push(`Only ${snap.commitCount} commits`);
  }

  if (/test|spec/i.test(snap.fileTree)) {
    score += 0.2;
    findings.push("Has tests");
  }

  const lines = snap.fileTree.split("\n").length;
  if (lines >= 10) {
    score += 0.2;
    findings.push(`${lines} entries in tree`);
  }

  if (snap.uniqueAuthors === 1) {
    score += 0.1;
    findings.push("Single-author commits");
  }

  // Dependabot factor: critical/high deduct from the structural score, capped
  // at -0.2 so a single bad transitive dep doesn't fail an otherwise solid PR.
  if (vulns?.available) {
    if (vulns.total === 0) {
      findings.push("0 known dependency vulnerabilities");
    } else {
      const penalty = Math.min(0.2, vulns.critical * 0.1 + vulns.high * 0.05);
      score -= penalty;
      findings.push(
        `${vulns.total} open Dependabot alert(s): ${vulns.critical} critical, ${vulns.high} high, ${vulns.medium} medium, ${vulns.low} low`,
      );
    }
  } else if (vulns) {
    findings.push("Dependabot not enabled — vuln scan skipped");
  }

  return {
    score: Math.max(0, Math.min(1, score)),
    summary: `Structural score from README, commit history, tests, tree, and dependency vulnerabilities.`,
    findings,
  };
}

function synthesize(
  structural: number,
  text: TextEvalResult,
  visual: VisualEvalResult | null,
): number {
  // Weighted blend. Visual is bonus when present.
  const base = structural * 0.2 + clamp01(text.overall) * 0.65;
  const visualBonus = visual ? clamp01(visual.visualScore) * 0.15 : 0;
  return Math.round((base + visualBonus + (visual ? 0 : 0.15 * 0.6)) * 100) / 100;
}

function clamp01(n: number | undefined): number {
  if (typeof n !== "number" || Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function parseDataUrl(dataUrl: string): { base64: string; mimeType: string } {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) {
    // Assume it's already base64
    return { base64: dataUrl, mimeType: "image/jpeg" };
  }
  return { mimeType: m[1]!, base64: m[2]! };
}
