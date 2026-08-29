/**
 * Harness: runs the baseline and the agentic workflow over the same cases and
 * reports the difference.
 *
 *   npm run eval -- --pipeline both --reference evals/grades.json --out evals/results
 *
 * Both pipelines get the same repositories, the same model chains, the same
 * free-tier budget and the same verifier. Nothing is given to one and withheld
 * from the other except the thing being tested: who chooses the evidence, and
 * whether claims are checked before they are scored.
 *
 * Results are written as JSON (every per-case number, for auditing) and as
 * Markdown (the comparison table). Cases run sequentially by design — free-tier
 * quotas are per-minute, and a parallel harness measures the rate limiter
 * rather than the pipelines.
 */

import { mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";
import { connectDB } from "../config/db.js";
import { env } from "../config/env.js";
import { getCredentialStore } from "../llm/credentialStore.js";
import { seedEnvCredentials } from "../llm/providers/registry.js";
import { logger } from "../utils/logger.js";
import { loadCases, type EvalCase } from "./cases.js";
import { runBaseline } from "./baseline.js";
import { runRepoEvaluation } from "../agents/repo-eval/orchestrator.js";
import {
  mean,
  meanAbsoluteError,
  pairwiseAccuracy,
  passAgreement,
  spearman,
  type Paired,
} from "./metrics.js";

type PipelineName = "baseline" | "agent";

type CaseResult = {
  id: string;
  repoUrl: string;
  reference: number;
  adversarial: boolean;
  predicted: number;
  passed: boolean;
  filesRead: string[];
  groundedness: number;
  claimCount: number;
  llmCalls: number;
  githubReads: number;
  latencyMs: number;
  error?: string;
};

type PipelineReport = {
  pipeline: PipelineName;
  results: CaseResult[];
  metrics: {
    spearman: number;
    pairwiseAccuracy: number;
    meanAbsoluteError: number;
    passAgreement: ReturnType<typeof passAgreement>;
    meanGroundedness: number;
    meanFilesRead: number;
    meanLlmCalls: number;
    meanLatencyMs: number;
    completed: number;
    failed: number;
  };
};

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const { cases, confirmed, source } = loadCases(args.reference);
  const outDir = resolve(args.out || "evals/results");
  mkdirSync(outDir, { recursive: true });

  const pipelines: PipelineName[] =
    args.pipeline === "both" ? ["baseline", "agent"] : [args.pipeline as PipelineName];

  console.log(`\nCases:     ${cases.length}  (${source})`);
  console.log(`Grades:    ${confirmed ? "confirmed" : "PROVISIONAL — regrade before citing"}`);
  console.log(`Pipelines: ${pipelines.join(", ")}`);
  console.log(`Output:    ${outDir}\n`);

  await connectDB();
  await seedEnvCredentials();
  await getCredentialStore().reload();

  const reports: PipelineReport[] = [];
  for (const pipeline of pipelines) {
    const results: CaseResult[] = [];
    for (const [i, c] of cases.entries()) {
      process.stdout.write(`[${pipeline}] ${i + 1}/${cases.length} ${c.id} … `);
      const result = await runCase(pipeline, c);
      results.push(result);
      console.log(
        result.error
          ? `failed (${result.error.slice(0, 60)})`
          : `${result.predicted.toFixed(2)} (ref ${c.reference.toFixed(2)}) · ${result.filesRead.length} files · ${result.llmCalls} calls · ${(result.latencyMs / 1000).toFixed(1)}s`,
      );
    }
    reports.push({ pipeline, results, metrics: computeMetrics(results) });
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const jsonPath = resolve(outDir, `results-${stamp}.json`);
  const mdPath = resolve(outDir, `results-${stamp}.md`);
  writeFileSync(
    jsonPath,
    JSON.stringify({ generatedAt: new Date().toISOString(), confirmed, source, reports }, null, 2),
  );
  writeFileSync(mdPath, renderMarkdown(reports, { confirmed, source, cases }));

  console.log(`\n${renderSummary(reports)}`);
  console.log(`\nWrote ${jsonPath}`);
  console.log(`Wrote ${mdPath}\n`);
  process.exit(0);
}

async function runCase(pipeline: PipelineName, c: EvalCase): Promise<CaseResult> {
  const base = {
    id: c.id,
    repoUrl: c.repoUrl,
    reference: c.reference,
    adversarial: !!c.adversarial,
  };
  try {
    if (pipeline === "baseline") {
      const r = await runBaseline({
        repoUrl: c.repoUrl,
        projectTitle: c.projectTitle,
        claimedSkills: c.claimedSkills,
        githubToken: env.GITHUB_TOKEN_FOR_PUBLIC_READS || undefined,
        verify: true,
      });
      return {
        ...base,
        predicted: r.finalScore,
        passed: r.passed,
        filesRead: r.filesRead,
        groundedness: r.groundedness,
        claimCount: r.claims.length,
        llmCalls: r.llmCalls,
        githubReads: r.githubReads,
        latencyMs: r.latencyMs,
      };
    }

    const r = await runRepoEvaluation({
      repoUrl: c.repoUrl,
      projectTitle: c.projectTitle,
      claimedSkills: c.claimedSkills,
      githubToken: env.GITHUB_TOKEN_FOR_PUBLIC_READS || undefined,
    });
    return {
      ...base,
      predicted: r.breakdown.final,
      passed: r.breakdown.passed,
      filesRead: r.meta.filesRead,
      groundedness: r.verification.groundedness,
      claimCount: r.verification.claims.length,
      llmCalls: r.meta.llmCalls,
      githubReads: r.meta.networkReads,
      latencyMs: r.meta.totalLatencyMs,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ case: c.id, pipeline, err: message }, "eval case failed");
    return {
      ...base,
      predicted: 0,
      passed: false,
      filesRead: [],
      groundedness: 0,
      claimCount: 0,
      llmCalls: 0,
      githubReads: 0,
      latencyMs: 0,
      error: message,
    };
  }
}

/**
 * A failed case is excluded from the correlation metrics but counted in the
 * report. Scoring a crash as 0 would let an unreliable pipeline look
 * well-calibrated whenever it happened to crash on a genuinely weak repository.
 */
function computeMetrics(results: CaseResult[]): PipelineReport["metrics"] {
  const ok = results.filter((r) => !r.error);
  const pairs: Paired[] = ok.map((r) => ({ predicted: r.predicted, reference: r.reference }));
  return {
    spearman: spearman(pairs),
    pairwiseAccuracy: pairwiseAccuracy(pairs),
    meanAbsoluteError: meanAbsoluteError(pairs),
    passAgreement: passAgreement(pairs, 0.65),
    meanGroundedness: mean(ok.map((r) => r.groundedness)),
    meanFilesRead: mean(ok.map((r) => r.filesRead.length)),
    meanLlmCalls: mean(ok.map((r) => r.llmCalls)),
    meanLatencyMs: mean(ok.map((r) => r.latencyMs)),
    completed: ok.length,
    failed: results.length - ok.length,
  };
}

function renderSummary(reports: PipelineReport[]): string {
  const rows = [
    ["metric", ...reports.map((r) => r.pipeline)],
    ["rank correlation (ρ)", ...reports.map((r) => r.metrics.spearman.toFixed(3))],
    ["pairwise accuracy", ...reports.map((r) => r.metrics.pairwiseAccuracy.toFixed(3))],
    ["mean abs. error", ...reports.map((r) => r.metrics.meanAbsoluteError.toFixed(3))],
    ["claim groundedness", ...reports.map((r) => r.metrics.meanGroundedness.toFixed(3))],
    ["files read (mean)", ...reports.map((r) => r.metrics.meanFilesRead.toFixed(1))],
    ["LLM calls (mean)", ...reports.map((r) => r.metrics.meanLlmCalls.toFixed(1))],
    ["latency s (mean)", ...reports.map((r) => (r.metrics.meanLatencyMs / 1000).toFixed(1))],
    ["failed cases", ...reports.map((r) => String(r.metrics.failed))],
  ];
  const widths = rows[0]!.map((_, i) => Math.max(...rows.map((r) => (r[i] || "").length)));
  return rows
    .map((r) => r.map((cell, i) => (cell || "").padEnd(widths[i]!)).join("  "))
    .join("\n");
}

function renderMarkdown(
  reports: PipelineReport[],
  meta: { confirmed: boolean; source: string; cases: EvalCase[] },
): string {
  const head = reports.map((r) => r.pipeline);
  const metricRow = (label: string, fn: (r: PipelineReport) => string) =>
    `| ${label} | ${reports.map(fn).join(" | ")} |`;

  const delta =
    reports.length === 2
      ? `\n**Change:** rank correlation ${fmtDelta(reports[0]!.metrics.spearman, reports[1]!.metrics.spearman)}, claim groundedness ${fmtDelta(reports[0]!.metrics.meanGroundedness, reports[1]!.metrics.meanGroundedness)}, cost ${reports[0]!.metrics.meanLlmCalls.toFixed(1)} → ${reports[1]!.metrics.meanLlmCalls.toFixed(1)} model calls per case.\n`
      : "";

  return `# Evaluation results

Generated ${new Date().toISOString()}
Cases: ${meta.cases.length} · Grades: ${meta.confirmed ? "confirmed" : "**provisional — regrade before citing these numbers**"} · Source: ${meta.source}

Primary metric is Spearman rank correlation against human grades: what this system owes its user is a trustworthy ordering.

## Comparison

| metric | ${head.join(" | ")} |
|---|${head.map(() => "---").join("|")}|
${metricRow("Rank correlation (ρ)", (r) => r.metrics.spearman.toFixed(3))}
${metricRow("Pairwise accuracy", (r) => r.metrics.pairwiseAccuracy.toFixed(3))}
${metricRow("Mean absolute error", (r) => r.metrics.meanAbsoluteError.toFixed(3))}
${metricRow("Pass/fail agreement", (r) => r.metrics.passAgreement.accuracy.toFixed(3))}
${metricRow("Claim groundedness", (r) => r.metrics.meanGroundedness.toFixed(3))}
${metricRow("Files read (mean)", (r) => r.metrics.meanFilesRead.toFixed(1))}
${metricRow("Model calls (mean)", (r) => r.metrics.meanLlmCalls.toFixed(1))}
${metricRow("Latency s (mean)", (r) => (r.metrics.meanLatencyMs / 1000).toFixed(1))}
${metricRow("Failed cases", (r) => String(r.metrics.failed))}
${delta}
## Per case

${reports
  .map(
    (r) => `### ${r.pipeline}

| case | ref | predicted | error | files | grounded | calls | s |
|---|---|---|---|---|---|---|---|
${r.results
  .map(
    (c) =>
      `| ${c.id}${c.adversarial ? " ⚠︎" : ""} | ${c.reference.toFixed(2)} | ${c.error ? "—" : c.predicted.toFixed(2)} | ${c.error ? "—" : Math.abs(c.predicted - c.reference).toFixed(2)} | ${c.filesRead.length} | ${c.groundedness.toFixed(2)} | ${c.llmCalls} | ${(c.latencyMs / 1000).toFixed(1)} |`,
  )
  .join("\n")}

${r.results.filter((c) => c.error).map((c) => `- **${c.id} failed:** ${c.error}`).join("\n")}`,
  )
  .join("\n\n")}

⚠︎ marks an adversarial case — a repository that looks better on the surface than it is.

## Evidence selected

The clearest single difference between the pipelines is which files each one read.

${reports
  .map(
    (r) => `**${r.pipeline}**\n\n${r.results
      .filter((c) => !c.error)
      .map((c) => `- \`${c.id}\`: ${c.filesRead.slice(0, 8).join(", ") || "(none)"}`)
      .join("\n")}`,
  )
  .join("\n\n")}
`;
}

function fmtDelta(from: number, to: number): string {
  const sign = to >= from ? "+" : "";
  return `${from.toFixed(3)} → ${to.toFixed(3)} (${sign}${(to - from).toFixed(3)})`;
}

function parseArgs(argv: string[]): { pipeline: string; reference?: string; out?: string } {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        out[key] = next;
        i++;
      } else {
        out[key] = "true";
      }
    }
  }
  const pipeline = out.pipeline || "both";
  if (!["both", "baseline", "agent"].includes(pipeline)) {
    throw new Error(`--pipeline must be one of: both, baseline, agent`);
  }
  return { pipeline, reference: out.reference, out: out.out };
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
