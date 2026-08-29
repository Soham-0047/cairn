import { runAgent } from "../runtime.js";
import { REPO_TOOLS, type RepoToolContext } from "../tools/repo.js";
import { INVESTIGATOR_GOAL, INVESTIGATOR_SYSTEM } from "./prompts.js";
import type { AgentRun, AgentStep } from "../types.js";

/**
 * Phase 1: the agent decides what evidence to gather.
 *
 * This replaces a fixed snapshot that read the first six code files in
 * alphabetical tree order. That ordering is uncorrelated with importance — for
 * a typical web project it returns config and generated boilerplate, and the
 * reviewer downstream then scores the repository without having seen its
 * actual logic. Letting the agent choose its own reads is the change that
 * makes every judgement after it worth anything.
 */

export type EvidenceItem = {
  claim: string;
  cite: string;
  kind: "strength" | "concern" | "neutral";
};

export type InvestigationResult = {
  projectSummary: string;
  stack: string[];
  entryPoints: string[];
  evidence: EvidenceItem[];
  testsPresent: boolean;
  historyNote: string;
};

export type Investigation = {
  result: InvestigationResult;
  run: AgentRun<unknown>;
  /** Files the agent chose to open — the visible difference from a fixed snapshot. */
  filesRead: string[];
  networkReads: number;
};

const EMPTY: InvestigationResult = {
  projectSummary: "",
  stack: [],
  entryPoints: [],
  evidence: [],
  testsPresent: false,
  historyNote: "",
};

export async function investigateRepo(params: {
  ctx: RepoToolContext;
  projectTitle: string;
  claimedSkills: string[];
  description: string;
  readme: string;
  budget?: number;
  maxSteps?: number;
  onStep?: (step: AgentStep) => void;
}): Promise<Investigation> {
  const run = await runAgent<RepoToolContext, unknown>({
    name: "investigator",
    task: "investigate_repo",
    systemPrompt: INVESTIGATOR_SYSTEM,
    goal: INVESTIGATOR_GOAL({
      owner: params.ctx.owner,
      repo: params.ctx.repo,
      title: params.projectTitle,
      claimedSkills: params.claimedSkills,
      description: params.description,
      readme: params.readme,
    }),
    tools: REPO_TOOLS,
    ctx: params.ctx,
    budget: params.budget ?? 12,
    maxSteps: params.maxSteps ?? 10,
    temperature: 0.15,
    maxTokens: 2048,
    onStep: params.onStep,
    // A final answer with no evidence means the agent gave up without looking.
    // Rejecting it costs one turn and usually produces a real investigation.
    validateFinal: (result) => {
      const r = result as Record<string, unknown> | null;
      if (!r || typeof r !== "object") return "final must be an object";
      if (!Array.isArray(r.evidence) || r.evidence.length === 0) {
        return "evidence is empty — read at least a few files and cite what you found";
      }
      if (typeof r.projectSummary !== "string" || r.projectSummary.trim().length < 20) {
        return "projectSummary is missing or too short";
      }
      return null;
    },
  });

  return {
    result: normalize(run.result),
    run,
    filesRead: [...params.ctx.blobs.keys()],
    networkReads: params.ctx.reads,
  };
}

function normalize(raw: unknown): InvestigationResult {
  if (!raw || typeof raw !== "object") return { ...EMPTY };
  const o = raw as Record<string, unknown>;
  return {
    projectSummary: typeof o.projectSummary === "string" ? o.projectSummary : "",
    stack: strArray(o.stack),
    entryPoints: strArray(o.entryPoints),
    evidence: Array.isArray(o.evidence)
      ? o.evidence
          .map((e) => {
            if (!e || typeof e !== "object") return null;
            const x = e as Record<string, unknown>;
            const claim = typeof x.claim === "string" ? x.claim.trim() : "";
            if (!claim) return null;
            const kindRaw = String(x.kind ?? "neutral").toLowerCase();
            const kind: EvidenceItem["kind"] =
              kindRaw.startsWith("str") ? "strength" : kindRaw.startsWith("con") ? "concern" : "neutral";
            return { claim, cite: typeof x.cite === "string" ? x.cite.trim() : "", kind };
          })
          .filter((e): e is EvidenceItem => e !== null)
          .slice(0, 24)
      : [],
    testsPresent: o.testsPresent === true || String(o.testsPresent).toLowerCase() === "true",
    historyNote: typeof o.historyNote === "string" ? o.historyNote : "",
  };
}

function strArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 12);
}
