/**
 * Captures a full, readable trajectory for every agent in the repo-evaluation
 * workflow, from one real run against one real repository.
 *
 *   npm run trajectory -- --case express
 *   npm run trajectory -- --repo https://github.com/you/thing --title "Thing" --skills "TypeScript,Express"
 *
 * Why this exists as a script rather than as a log scrape: the workflow already
 * returns everything needed — the investigator's step-by-step run (thought,
 * tool, args, observation, model, latency, budget), each specialist's raw
 * judgement, every claim with its verdict and the reason it survived or was
 * dropped, and the final score arithmetic. A trajectory is just that object
 * rendered in the order it happened, so it is written from the returned run
 * rather than reconstructed from log lines that may have been sampled away.
 *
 * Two files are written per run:
 *
 *   <case>.md    — one section per agent, in execution order. Meant to be read.
 *   <case>.json  — the whole outcome plus the event timeline. Meant to be diffed.
 *
 * Nothing here is synthesised. If a phase failed, the failure is what gets
 * written down.
 */

import { mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";
import { connectDB } from "../config/db.js";
import { env } from "../config/env.js";
import { getCredentialStore } from "../llm/credentialStore.js";
import { seedEnvCredentials } from "../llm/providers/registry.js";
import { STARTER_CASES } from "../evals/cases.js";
import {
  runRepoEvaluation,
  type RepoEvalOutcome,
  type WorkflowEvent,
} from "../agents/repo-eval/orchestrator.js";
import {
  CRAFT_LENS,
  INVESTIGATOR_SYSTEM,
  ORIGINALITY_LENS,
  SKILL_MATCH_LENS,
  SPECIALIST_SYSTEM,
  SYNTHESIS_SYSTEM,
  VERIFIER_SYSTEM,
} from "../agents/repo-eval/prompts.js";

type TimelineEntry = WorkflowEvent & { atMs: number };

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const target = resolveTarget(args);
  const outDir = resolve(args.out || "../submission/trajectories");
  mkdirSync(outDir, { recursive: true });

  console.log(`\nRepository: ${target.repoUrl}`);
  console.log(`Submitted as: "${target.projectTitle}"`);
  console.log(`Claimed skills: ${target.claimedSkills.join(", ") || "(none)"}`);
  console.log(`Output: ${outDir}\n`);

  await connectDB();
  await seedEnvCredentials();
  await getCredentialStore().reload();

  const startedAt = Date.now();
  const timeline: TimelineEntry[] = [];

  const outcome = await runRepoEvaluation({
    repoUrl: target.repoUrl,
    projectTitle: target.projectTitle,
    claimedSkills: target.claimedSkills,
    githubToken: env.GITHUB_TOKEN_FOR_PUBLIC_READS || undefined,
    emit: (e) => {
      timeline.push({ ...e, atMs: Date.now() - startedAt });
      console.log(`  ${(( Date.now() - startedAt) / 1000).toFixed(1).padStart(6)}s  ${describe(e)}`);
    },
  });

  const stamp = new Date().toISOString();
  const base = resolve(outDir, target.id);
  writeFileSync(
    `${base}.json`,
    JSON.stringify({ capturedAt: stamp, target, timeline, outcome }, null, 2),
  );
  writeFileSync(`${base}.md`, render({ capturedAt: stamp, target, timeline, outcome }));

  console.log(`\nScore ${outcome.breakdown.final.toFixed(2)} — ${outcome.breakdown.passed ? "PASS" : "FAIL"}`);
  console.log(`Wrote ${base}.md`);
  console.log(`Wrote ${base}.json\n`);
  process.exit(0);
}

/* -------------------------------- rendering ------------------------------- */

function render(r: {
  capturedAt: string;
  target: Target;
  timeline: TimelineEntry[];
  outcome: RepoEvalOutcome;
}): string {
  const { outcome: o, target } = r;
  const inv = o.investigation;

  return `# Agent trajectory — ${target.id}

Captured ${r.capturedAt} · \`npm run trajectory -- --case ${target.id}\`

**Repository:** ${target.repoUrl}
**Submitted as:** "${target.projectTitle}"
**Claimed skills:** ${target.claimedSkills.join(", ") || "(none stated)"}

**Outcome:** score **${o.breakdown.final.toFixed(2)}** — ${o.breakdown.passed ? "PASS" : "FAIL"}. ${o.breakdown.passReason}
**Cost:** ${o.meta.llmCalls} model calls · ${o.meta.networkReads} GitHub reads · ${(o.meta.totalLatencyMs / 1000).toFixed(1)}s

Every section below is a verbatim record of one run. Nothing is edited for
readability except truncation of long tool observations, which is marked where
it happens.

---

## Phase timeline

| at | event |
|---|---|
${r.timeline.map((e) => `| ${(e.atMs / 1000).toFixed(1)}s | ${describe(e)} |`).join("\n")}

---

## Agent 1 — Investigator

Tool-using. Chooses which files to read, and must cite a file and line for
every finding it reports.

<details><summary>Instructions given to it (verbatim)</summary>

\`\`\`
${INVESTIGATOR_SYSTEM}
\`\`\`

</details>

**Run:** ${inv.run.steps.length} step(s), budget ${inv.run.budgetUsed}/${inv.run.budgetLimit}, stopped because \`${inv.run.stoppedBecause}\`${inv.run.error ? ` — ${inv.run.error}` : ""}.

${inv.run.steps
  .map((s) => {
    const head = s.tool
      ? `### Step ${s.index + 1} — \`${s.tool}\`${s.isError ? " ⚠ error" : ""}`
      : `### Step ${s.index + 1} — final answer${s.isError ? " ⚠ rejected" : ""}`;
    const meta = `\`${s.provider || "?"}/${s.model || "?"}\` · ${(s.latencyMs / 1000).toFixed(1)}s · budget ${s.budgetSpent}/${inv.run.budgetLimit}`;
    const args = s.args && Object.keys(s.args).length
      ? `\n**Arguments**\n\n\`\`\`json\n${JSON.stringify(s.args, null, 2)}\n\`\`\`\n`
      : "";
    const obs = s.observation
      ? `\n**Tool responded**\n\n\`\`\`\n${clip(s.observation, 2000)}\n\`\`\`\n`
      : "";
    return `${head}

${meta}

**Its reasoning:** ${s.thought || "(none given)"}
${args}${obs}`;
  })
  .join("\n")}

### What it concluded

${inv.result.projectSummary || "(no summary)"}

- **Stack:** ${inv.result.stack.join(", ") || "unidentified"}
- **Entry points:** ${inv.result.entryPoints.join(", ") || "unidentified"}
- **Tests present:** ${inv.result.testsPresent ? "yes" : "no"}
- **Commit history:** ${inv.result.historyNote || "not examined"}
- **Files it chose to open (${inv.filesRead.length}):** ${inv.filesRead.map((f) => `\`${f}\``).join(", ") || "(none)"}

| # | kind | finding | citation |
|---|---|---|---|
${inv.result.evidence.map((e, i) => `| ${i + 1} | ${e.kind} | ${esc(e.claim)} | \`${e.cite || "—"}\` |`).join("\n")}

---

## Deterministic anchor — structural signals

Not an agent. Computed from the repository, so it cannot be argued into a
different answer, and it is what the final score falls back toward when
verification goes badly.

**Score ${o.structural.score.toFixed(2)}**

${o.structural.findings.map((f) => `- ${f}`).join("\n")}

---

## Agents 2–4 — Specialist reviewers (parallel)

Three independent calls over the same dossier — the investigator's findings
plus the source it read. No shared context between them, which is what lets a
repository come out well-built and unoriginal at the same time.

<details><summary>Shared instruction template (verbatim)</summary>

\`\`\`
${SPECIALIST_SYSTEM({ role: "{role}", question: "{question}", rubric: "{rubric}" })}
\`\`\`

</details>

${o.specialists
  .map((s) => {
    const lens =
      s.name === "originality" ? ORIGINALITY_LENS : s.name === "craft" ? CRAFT_LENS : SKILL_MATCH_LENS;
    return `### ${s.name}

**Its lens:** ${lens.role}
**Its single question:** ${lens.question}

<details><summary>Rubric it was given</summary>

\`\`\`
${lens.rubric}
\`\`\`

</details>

**Verdict:** ${s.score.toFixed(2)} · confidence ${s.confidence} · \`${s.provider || "?"}/${s.model || "?"}\` · ${(s.latencyMs / 1000).toFixed(1)}s

${s.reasoning || "(no reasoning returned)"}

${s.claims.length ? `| claim | citation | polarity |\n|---|---|---|\n${s.claims.map((c) => `| ${esc(c.text)} | \`${c.cite || "—"}\` | ${c.polarity} |`).join("\n")}` : "_No claims returned._"}
`;
  })
  .join("\n")}

---

## Agent 5 — Verifier

Re-reads every claim against the exact lines it cites. It can only delete.

<details><summary>Instructions given to it (verbatim)</summary>

\`\`\`
${VERIFIER_SYSTEM}
\`\`\`

</details>

**Result:** ${o.verification.supported.length} of ${o.verification.claims.length} claims survived — groundedness **${o.verification.groundedness.toFixed(2)}** — in ${o.verification.llmCalls} batched call(s) over ${(o.verification.latencyMs / 1000).toFixed(1)}s.

Batching is per file rather than per claim: ${o.verification.claims.length} claims cost ${o.verification.llmCalls} calls instead of ${o.verification.claims.length}.

| claim | from | citation | verdict | why |
|---|---|---|---|---|
${o.verification.claims
  .map(
    (c) =>
      `| ${esc(c.text)} | ${c.source} | \`${c.cite || "—"}\` | ${c.verdict === "supported" ? "✅ supported" : `❌ ${c.verdict}`} | ${esc(c.reason)} |`,
  )
  .join("\n")}

${
  o.verification.dropped.length
    ? `**Dropped (${o.verification.dropped.length}).** These never reach the user's review, and the product shows them with these reasons rather than hiding them:\n\n${o.verification.dropped.map((c) => `- _${esc(c.text)}_ — ${esc(c.reason)}`).join("\n")}`
    : "**Nothing was dropped on this run.** That is worth noticing rather than celebrating: a verifier that never fires is indistinguishable from one that is not running."
}

---

## Agent 6 — Synthesiser

Writes the review the developer actually reads, from surviving claims only.
It is given no material it could add a new observation from.

<details><summary>Instructions given to it (verbatim)</summary>

\`\`\`
${SYNTHESIS_SYSTEM}
\`\`\`

</details>

**Input:** three specialist scores, the structural findings, ${o.verification.supported.length} verified claim(s), and a count of ${o.verification.dropped.length} discarded one(s).

> ${o.review.feedback.split("\n").join("\n> ") || "(no feedback returned)"}

**Strengths**

${o.review.strengths.map((s) => `- ${s}`).join("\n") || "- (none)"}

**Improvements**

${o.review.improvements.map((s) => `- ${s}`).join("\n") || "- (none)"}

${o.review.verdictLine ? `**Verdict line:** ${o.review.verdictLine}` : ""}

---

## Score arithmetic

| component | value | nominal weight | confidence | effective weight | present |
|---|---|---|---|---|---|
${o.breakdown.components
  .map(
    (c) =>
      `| ${c.label} | ${c.present ? c.value.toFixed(2) : "—"} | ${c.weight.toFixed(2)} | ${c.confidence || "—"} | ${(c.effectiveWeight * 100).toFixed(1)}% | ${c.present ? "yes" : "no"} |`,
  )
  .join("\n")}

- Weighted blend of the components: **${o.breakdown.modelScore.toFixed(2)}**
- Deterministic structural anchor: **${o.breakdown.structural.toFixed(2)}**
- Groundedness: **${o.breakdown.groundedness.toFixed(2)}** → shrinkage toward the anchor: **${(o.breakdown.shrinkage * 100).toFixed(0)}%**
- **Final: ${o.breakdown.final.toFixed(2)}** — ${o.breakdown.passed ? "PASS" : "FAIL"}. ${o.breakdown.passReason}

## Models that answered

| stage | provider | model | latency |
|---|---|---|---|
${o.meta.modelsUsed.map((m) => `| ${m.stage} | ${m.provider} | ${m.model} | ${(m.latencyMs / 1000).toFixed(1)}s |`).join("\n")}

The chain is health-aware and non-deterministic by design, so re-running this
capture will not necessarily produce the same models in this table.

## Human checkpoints on this run

- Every phase above streams to the user over SSE while it runs. They watch the
  real thing, not a progress placeholder.
- The results page shows the dropped claims and the reason each was dropped,
  so the user can tell a strict system from an idle one.
- The score arithmetic above is rendered in the product. A user who disagrees
  can see which step to argue with.
- A credential is only issued on a pass, and the pass rule includes an
  originality floor that no other component can outvote.
`;
}

/* --------------------------------- helpers -------------------------------- */

function describe(e: WorkflowEvent): string {
  switch (e.type) {
    case "phase":
      return `${e.label} — ${e.status}${e.detail ? ` (${e.detail})` : ""}`;
    case "tool":
      return `step ${e.step + 1}: ${e.tool}(${Object.entries(e.args)
        .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
        .join(", ")})${e.ok ? "" : " — error"}`;
    case "specialist":
      return `${e.name}: ${e.score.toFixed(2)} (${e.confidence} confidence)`;
    case "verdict":
      return `${e.supported} claims held, ${e.dropped} dropped — groundedness ${e.groundedness.toFixed(2)}`;
    case "score":
      return `final ${e.final.toFixed(2)} — ${e.passed ? "PASS" : "FAIL"}`;
  }
}

/** Table cells cannot contain a raw pipe or newline. */
function esc(s: string): string {
  return (s || "").replace(/\|/g, "\\|").replace(/\n+/g, " ").trim();
}

function clip(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n)}\n… [${s.length - n} more chars in the .json]`;
}

type Target = {
  id: string;
  repoUrl: string;
  projectTitle: string;
  claimedSkills: string[];
};

function resolveTarget(args: Record<string, string>): Target {
  if (args.repo) {
    return {
      id: args.id || args.repo.split("/").pop() || "capture",
      repoUrl: args.repo,
      projectTitle: args.title || args.repo.split("/").pop() || "Untitled",
      claimedSkills: (args.skills || "").split(",").map((s) => s.trim()).filter(Boolean),
    };
  }
  const id = args.case || "express";
  const c = STARTER_CASES.find((x) => x.id === id);
  if (!c) {
    throw new Error(
      `No such case "${id}". Available: ${STARTER_CASES.map((x) => x.id).join(", ")}. ` +
        `Or pass --repo <url> --title <title> --skills <a,b,c>.`,
    );
  }
  return {
    id: c.id,
    repoUrl: c.repoUrl,
    projectTitle: c.projectTitle,
    claimedSkills: c.claimedSkills,
  };
}

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (!a.startsWith("--")) continue;
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      out[a.slice(2)] = next;
      i++;
    } else {
      out[a.slice(2)] = "true";
    }
  }
  return out;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
