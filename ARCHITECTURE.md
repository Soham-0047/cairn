# Architecture

Why the repository-review workflow is built the way it is, and what each
decision is meant to buy. Written for someone deciding whether to trust the
design, or to change it.

---

## The thing being solved

Asking a language model "is this repository any good?" produces a fluent,
specific, plausible answer whether or not the model saw the repository. The
output looks the same either way. That is the whole problem: the failure mode
is invisible at the point of use, and the user only discovers it by acting on a
claim about code that does not exist.

Every design choice below exists to make that failure mode visible or
impossible.

---

## 1. The agent chooses its own evidence

**Before.** A fixed snapshot: the first six code files in alphabetical tree
order, truncated to 2000 characters each
(`fetchRepoSnapshot`, still used by the baseline).

Alphabetical order is uncorrelated with importance. For a typical web project
it returns `app/api/...` boilerplate and config, and the reviewer then scores
the repository without having seen its logic. Every judgement downstream was
built on evidence selected by a rule with no idea what it was selecting.

**Now.** An agent with read-only tools — `list_files`, `read_file`,
`search_code`, `read_history`, `read_manifest` — decides what to open. It sees
the tree, forms a hypothesis about where the real work lives, and reads that.
It can check a specific suspicion with `search_code` (are there real tests, or
one placeholder?) without spending a read on a whole file.

This is the change that makes everything after it worth anything, and it is
also the one with a clear failure mode of its own: an agent that wanders. Hence
the budget below.

## 2. The agent loop is bounded three ways

`agents/runtime.ts` is a ReAct loop with three constraints:

**A budget, not a step count.** Each tool declares a cost; the run stops when
the budget is spent. Step count alone lets an agent burn a free-tier quota on
cheap-looking calls. Latency and quota are bounded by construction.

**Repeat-call suppression.** A repeated (tool, args) pair returns the cached
observation plus an explicit nudge, costing no budget. Small models loop when
unsure what to do next; this breaks the loop without failing the run.

**One repair attempt per malformed reply.** When the model returns prose
instead of action JSON, it gets the parse error back and one retry. Without it
a single stray markdown fence kills an otherwise healthy run.

## 3. Tools are a JSON protocol, not native function calling

The model chain spans Google (Gemma and Gemini), OpenRouter, Groq and Cerebras.
Native tool calling is either unsupported — Gemma via the Gemini REST API — or
subtly incompatible across them. A chain link that cannot express a tool call
would silently emit prose instead of an action.

Every model in the chain can emit JSON. Expressing tools as a JSON action
protocol in the prompt means a tool-using agent survives failover to any
provider, which is the property the whole system rests on. The cost is parsing
robustness, which is why `extractJsonObject` handles fences, prose either side,
and braces inside string literals — and is directly unit-tested.

## 4. Three reviewers, three lenses, in parallel

One prompt scoring originality, craft and skill-match together shares a single
context. A model that forms a favourable overall impression tends to carry it
across all three axes — the failure case being a polished tutorial clone that
scores well everywhere.

Separate calls remove the shared context: the originality reviewer never sees
the craft reviewer's opinion, so a repository can legitimately come out
well-built and unoriginal at the same time. They run concurrently because they
are independent, which on a 15 RPM free tier is the difference between a few
seconds and most of a minute.

Whether this actually decorrelates the scores is measurable, and the harness
records all three per case.

## 5. Verification can only remove

Every claim — from the specialists *and* from the investigator — must carry a
`path:line` citation. `agents/repo-eval/verifier.ts` then checks it twice:

**Mechanically**, free: does that file exist, did the agent actually open it,
does that line number exist? This alone catches the most common failure, a
confident claim citing a plausible path that is not in the repository.

**Semantically**, batched per file: do those specific lines show what the claim
says? Batching by file turns 30 claims across 6 files into 6 calls rather than
30, which is what keeps it affordable.

The verifier is deliberately one-directional — it can drop a claim, never add
or rewrite one. A verifier that could edit claims would just be another
generator, and its output would need verifying in turn.

It is also deliberately strict about scope: a claim that is probably true but
not visible in the cited lines is "unsupported". Being wrong about *this*
citation is what is being tested, not whether the statement happens to hold
elsewhere.

**Dropped claims are shown to the user**, with the reason. What a system
rejected is better evidence that it is checking than any badge claiming it
does.

## 6. Scoring: renormalise, weight by confidence, shrink toward the anchor

**Before.** `structural*0.2 + review*0.65 + visual*0.15`, plus a flat `+0.09`
when no screenshots were supplied. A project with no UI evidence received nine
free points for the absence of evidence.

**Now** (`agents/repo-eval/scoring.ts`), three changes:

1. **Renormalise over present components.** A missing component redistributes
   its weight proportionally. Submitting less evidence can no longer raise a
   score.

2. **Weight by the reviewer's own confidence.** A low-confidence lens keeps its
   opinion but carries less of the total, and the others take up the slack.
   This stops a failed or hedging reviewer from dragging a well-evidenced score
   to the middle.

3. **Shrink toward the deterministic anchor when claims did not verify.**
   Groundedness — the share of claims that survived — is the system's own
   measure of how much of the review was real. When it is low the score moves
   toward the structural signal, which is computed from the repository and
   cannot be hallucinated. A confident review built on claims that did not
   check out no longer scores like a verified one.

Some verification loss is normal and healthy; a verifier that never rejects
anything is not working. Only a largely unverifiable report is pulled back, and
shrinkage is capped at 50% so the model's work always keeps most of the weight.

## 7. Structural signals never touch a model

`scoreStructural` is computed entirely from the repository: README word count,
test files by path convention, source-file count on a saturating curve, commit
pattern, project hygiene (lockfile, CI, container), Dependabot alerts.

It is the anchor the final score falls back toward, so nothing in it may depend
on model output. That is a hard constraint, not a preference — an anchor
derived from the thing it is anchoring is not an anchor.

## 8. Evaluation runs in the background

An agent run that reads a dozen files and makes twenty model calls does not fit
inside a request timeout. `POST /api/evaluations` now creates the record and
returns `202`; the run continues in the background and the client follows it
over SSE, including live tool calls. Pretending otherwise is what produced 502s
on the previous synchronous path.

## 9. Routing: fitness sets the candidates, health orders them

Two inputs, answering different questions:

- **Static chains** (`llm/router.ts`) encode *task fitness* — which models are
  good at this job, hand-ordered. A health endpoint cannot supply that.
- **The admin-service** supplies *current health* — which keys and models are
  rate-limited or failing right now, aggregated across every project sharing
  the free-tier pool. That is strictly better information than one process has:
  a key exhausted by another consumer is routed around before the first local
  429.

`llm/routeSource.ts` reorders the chain's head by health using
**Power-of-Two-Choices**. Strict best-first is what makes free tiers collapse —
every instance computes the same ranking, floods the same model, exhausts it,
and moves as one to the next, using a parallel quota serially. Sampling two
from the head and taking the healthier one spreads load without ever picking
something bad, and a wrong guess still costs only one hop because the rest of
the chain follows in fitness order.

Outcomes are reported back after every call, including a 200 carrying
unparseable output — an endpoint that always answers with junk is not healthy.

Unhealthy models sink within their segment rather than being dropped. Dropping
would leave the chain shorter than the operator configured, and a stale health
signal would then remove a working model outright.

---

## Failure handling

Every optional dependency degrades rather than failing the run:

| Missing | Effect |
|---|---|
| Admin-service | Chains run as configured; keys come from the local vault |
| Vector store | No fingerprint check; the originality lens judges from code alone |
| Screenshots | Visual component absent; its weight redistributes |
| Dependabot | No vulnerability finding; nothing is assumed |
| One specialist fails | Neutral score at low confidence, down-weighted, shown as unavailable |
| Verifier batch fails | Claims kept and labelled "not checked" — never silently passed as verified |
| Synthesis fails | Falls back to listing the verified claims: worse to read, still honest, never empty |

The verifier case is the one worth stating explicitly. A verifier outage must
not present unchecked claims as verified, and must not throw away the whole
evaluation. It does neither: they are kept, labelled, and the UI distinguishes
them.

---

## What is deliberately not here

**A tool that runs the code.** Building and running an untrusted repository
needs a sandbox, and a half-sandbox is worse than none. Test *presence* is
measured; test *passing* is not, and the review says so rather than implying it.

**Cross-run memory.** Nothing carries between evaluations. It would help — a
corpus of prior reviews would calibrate what a 0.7 looks like — but memory that
influences scoring needs its own verification story, and adding an unverified
input to a system built around verification would be the wrong trade.

**Automatic credential revocation.** Credentials are issued automatically but
only removed by hand. An automated system that retracts something a person put
on their portfolio should have a human in the loop.
