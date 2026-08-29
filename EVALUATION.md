# Evaluation

How the repository reviewer is measured, what changed and why, and what the
numbers do and do not yet establish.

---

## What "good" means here

A reviewer using this system asks a comparative question: *is this candidate's
project stronger than that one?* So the primary metric is **Spearman rank
correlation against human grades**, not mean error.

A pipeline that scores everything 0.2 too high but orders correctly is useful —
the offset is a threshold adjustment. One that hits the average and shuffles the
order is not. Mean absolute error is reported alongside, because a system that
ranks well but scores everyone 0.9 still has no usable pass threshold.

Secondary metrics:

| Metric | What it tells you |
|---|---|
| **Claim groundedness** | Share of claims that survive checking against the source they cite. The honesty metric — and the one this project is really about. |
| **Pairwise accuracy** | Of all pairs the humans ordered, how many did the pipeline order the same way. Same signal as ρ, easier to explain. |
| **Pass/fail agreement** | Accuracy at the 0.65 threshold, split into false passes and false fails. A false pass is worse: it certifies work that should not be certified. |
| **Files read** | The clearest single difference between the pipelines. |
| **Model calls, latency** | The cost of the improvement. |

---

## The baseline

`backend/src/evals/baseline.ts` is the pipeline as it stood before this work,
kept verbatim rather than reimplemented in a friendlier form. A comparison is
only worth something if the baseline is the thing that actually shipped.

It gets the same repositories, the same model chains, the same free-tier budget
and the same verifier. The differences are exactly the two things under test:

1. **Evidence selection.** Baseline: the first six code files in alphabetical
   tree order, truncated to 2000 characters. Agent: chooses its own reads.
2. **Verification.** Baseline: none — claims are scored as produced. Agent:
   every claim checked against its citation before scoring.

The baseline emits prose rather than citations, so for a fair groundedness
number each statement is treated as a claim, any file reference is extracted
from the text, and it is checked against the excerpts the baseline was actually
given. That is precisely the check it never did.

### Fairness notes

- Both run sequentially. Free-tier quotas are per-minute; a parallel harness
  measures the rate limiter, not the pipelines.
- Both use the same `LLMRouter`, so provider availability affects them equally.
- The agent makes **more** model calls and reads **more** files. That is the
  cost, and it is reported rather than hidden — see the results table.
- A crashed case is excluded from correlation but counted in the report.
  Scoring a crash as 0 would let an unreliable pipeline look well-calibrated
  whenever it happened to crash on a genuinely weak repository.

---

## The case set

`backend/src/evals/cases.ts`. Grading bands:

| Band | Meaning |
|---|---|
| 0.90–1.00 | Production software. Tested, documented, handles failure, used by others. |
| 0.70–0.89 | Strong personal project. Real functionality, some tests, defensible decisions. |
| 0.50–0.69 | Working but shallow. Thin on tests and error handling. A tutorial meaningfully extended. |
| 0.30–0.49 | A followed tutorial, or a scaffold with little added. |
| 0.00–0.29 | Empty, broken, or a verbatim copy. |

**The shipped grades are provisional.** They are a starting point, not measured
ground truth, and repositories change. The harness prints `PROVISIONAL` and
stamps it into the report until a reference file is supplied. Before citing any
figure from this document:

```bash
# 1. Open each repository. Apply the bands above. Write your grades:
cat > backend/evals/grades.json <<'EOF'
[
  { "id": "express", "reference": 0.93, "note": "why you graded it this way" },
  { "id": "my-tutorial-case", "repoUrl": "https://github.com/…",
    "projectTitle": "…", "claimedSkills": ["…"], "reference": 0.4, "note": "…" }
]
EOF

# 2. Run against them
cd backend && npm run eval -- --reference evals/grades.json
```

Two people grading independently is better still: their disagreement is the
noise floor, and no pipeline can be meaningfully separated from another by less
than it.

### Coverage the set needs

The shipped starter set covers the production band only, across four languages
and two orders of magnitude of project size. It is deliberately incomplete —
a good low-band case is one you have opened and confirmed, and a stale link to
somebody's abandoned repository is worse than no case at all. Add your own with
GitHub search:

```
todo app in:name created:>2024-01-01 stars:<3
"following this tutorial" in:readme stars:<3
```

**At least one adversarial case is required.** A repository that looks better
than it is — a polished README over a thin implementation — is what separates a
system reading evidence from one reading marketing. `todomvc` is in the starter
set for this: well maintained and widely known, but by design the canonical
tutorial app repeated many times. A pipeline reading reputation instead of code
will over-rate it.

---

## Results

> **Not yet run.** The harness is implemented and the offline tests pass, but no
> full baseline-vs-agent run has been executed against live provider keys. The
> table below is the shape of the output, not a result. Run
> `cd backend && npm run eval` to fill it, and replace this note with the run
> date, the provider keys used, and the grade source.

| Metric | Baseline | Agent | Change |
|---|---|---|---|
| Rank correlation (ρ) | — | — | — |
| Pairwise accuracy | — | — | — |
| Mean absolute error | — | — | — |
| Pass/fail agreement | — | — | — |
| **Claim groundedness** | — | — | — |
| Files read (mean) | 6 (fixed) | — | — |
| Model calls (mean) | 1 | — | — |
| Latency (mean) | — | — | — |

The harness writes both a JSON record of every per-case number and a Markdown
table to `backend/evals/results/`, including a per-case list of which files each
pipeline read — the most legible single difference between them.

---

## Improvement changelog

Each entry: what changed, why, and **what evidence would settle whether it was
right**. Entries marked *measured* have supporting numbers; entries marked
*reasoned* are design decisions whose payoff the harness is built to test.
Nothing here is claimed as measured that has not been.

### 0 · Baseline

The shipped pipeline: fixed six-file snapshot → one prompt → score. No tool use,
no verification, no citations.

Two specific defects found by reading it:

- `github.service.ts` selected evidence with `interesting.slice(0, 6)` over an
  alphabetically-ordered tree. For most projects that is config and boilerplate.
- `synthesize()` added a flat `+0.09` when no screenshots were supplied —
  scoring points for the absence of evidence.

*Decision: keep it verbatim as the comparison point.*

### 1 · Tool-using investigator — *reasoned*

**Why.** Evidence chosen by alphabetical order is evidence chosen at random with
respect to quality. No downstream judgement can be better than its input.

**What.** `agents/runtime.ts` plus a read-only GitHub toolbelt. The agent forms
a hypothesis from the tree and reads accordingly.

**Settled by.** Rank correlation, and the per-case file lists in the report — do
the agent's reads look like what a reviewer would open?

*Kept. This is the load-bearing change; everything after it exists to make its
output trustworthy.*

### 2 · JSON action protocol instead of native tool calling — *reasoned*

**Why.** The chain spans five providers. Gemma via the Gemini REST API has no
usable function calling, so a chain link could silently degrade to prose.

**What.** Tools described in the prompt; one JSON object per turn; a balanced-brace
extractor that survives fences, surrounding prose, and braces inside strings.

**Settled by.** Parse-failure rate per model, recorded per step in the run.

*Kept. It is the reason failover to any provider preserves tool use at all.*

### 3 · Budget, repeat suppression, one repair — *reasoned*

**Why.** An unbounded agent on a free tier is a quota incident. Step limits
alone don't bound cost, models loop when uncertain, and one stray fence
shouldn't kill a run.

**What.** Per-tool costs against a run budget; cached repeats that cost nothing
and carry a nudge; one retry per malformed reply carrying the parse error.

**Settled by.** Distribution of `stoppedBecause` across cases, and the spread of
`budgetUsed`. If most runs end on `budget` rather than `final`, the budget is
too tight.

*Kept.*

### 4 · Three lenses instead of one prompt — *reasoned*

**Why.** Scoring three axes in one context shares one impression across all
three; the failure case is a polished tutorial clone scoring well everywhere.

**What.** Independent concurrent calls, one lens each, no shared context.

**Settled by.** Correlation *between* the three sub-scores across cases. High
correlation means the split bought nothing and should be reverted for the cost
saving.

*Kept, pending that measurement. This is the entry most likely to be revised.*

### 5 · Claim verification — *reasoned, partly measured*

**Why.** The failure this whole project targets: fluent claims about code that
isn't there.

**What.** Mandatory `path:line` citations; mechanical resolution against the
files the agent actually opened; batched semantic checking per file. Drop-only.

**Measured.** The mechanical layer found a bug in its own citation parser — the
regex dropped the `L` in GitHub-style `#L42-L58` ranges and collapsed them to a
single line, so the verifier checked the wrong excerpt. Caught by unit test,
now covered (`agents.test.ts`).

**Settled by.** Groundedness for both pipelines, and the false-pass count.

*Kept. Batching per file rather than per claim brought the cost from ~30 calls
to ~6 on a typical run.*

### 6 · Scoring rework — *measured*

**Why.** The old formula paid a flat bonus for missing evidence and treated a
guessing reviewer identically to a certain one.

**What.** Renormalise over present components; weight by reviewer confidence;
shrink toward the deterministic anchor in proportion to unverified claims.

**Measured.** Property tests in `agents.test.ts` establish: weights sum to 1
across present components; omitting screenshots cannot raise the score;
low confidence scores below high confidence on identical inputs; ungrounded
scores below grounded on identical inputs; the originality floor blocks a pass
regardless of the other components. 50 tests, no keys or database required.

*Kept.*

### 7 · Asynchronous evaluation — *measured*

**Why.** The run got longer. The synchronous route already produced 502s;
adding a dozen file reads to it would guarantee them.

**What.** `POST` returns `202` with the record; the run continues in the
background; SSE streams phases, tool calls and verification verdicts, and
replays state to a late or reconnecting subscriber.

**Measured.** The front end no longer waits, and the artificial 9-second
"scanning" delay that covered the old blocking call is gone — the user watches
the real run instead of a placeholder standing in for it.

*Kept.*

### 8 · Health-aware routing — *reasoned*

**Why.** The admin-service client was calling endpoints that no longer exist
(`/public/credentials`), so the health data it publishes was not being used at
all. Separately, strict best-first routing is what exhausts free tiers: every
instance ranks identically, floods one model, and moves as one to the next.

**What.** Client rewritten against the documented API. Static chains keep task
fitness; live health reorders the head via Power-of-Two-Choices; outcomes
(including 200s carrying unparseable output) are reported back.

**Settled by.** Rate-limit failures per hundred calls, before and after, and
distribution of `finalModel` across a run — a flat distribution means the
spreading works.

*Kept. Falls back to the configured chains whenever the service is unreachable.*

### 9 · Originality fingerprinting moved inside the workflow — *measured*

**Why.** It was calling `fetchRepoSnapshot` separately — roughly nine GitHub
API calls duplicating what the agent was already doing, and fingerprinting a
worse sample.

**What.** Now runs after the investigation over the files the agent chose, and
feeds the originality lens as evidence rather than as a verdict.

**Measured.** Nine redundant GitHub reads per evaluation removed. Better sample
at strictly lower cost.

*Kept.*

### Considered and rejected

**A `run_tests` tool.** Highest-value signal available — test *passing* rather
than test *presence*. Needs a real sandbox for untrusted code, and a
half-sandbox is worse than none. Not attempted rather than attempted badly.

**Per-claim semantic verification.** Stricter than batching per file: a model
handed one claim cannot get lazy across a list. At ~30 claims per run it does
not fit a free-tier quota alongside everything else. Batched by file instead,
with a cap; claims past the cap are kept and labelled rather than dropped, so
the distinction stays visible.

**Cross-run memory.** A corpus of prior reviews would calibrate what a 0.7 looks
like. Rejected for now: memory that influences scoring needs its own
verification story, and adding an unverified input to a system built around
verification is the wrong trade.

---

## Reproduction

From a clean environment.

**Versions.** Node 20.20.1, npm 10, MongoDB 7 (local or Atlas M0). Backend and
frontend are separate packages.

```bash
git clone <repo> && cd <repo>

# --- offline tests: no keys, no database, ~1s ---
cd backend
npm install
npm test          # 50 tests

# --- full harness: needs keys ---
cp .env.example .env
# Required: MONGODB_URI, JWT_SECRET, ADMIN_SECRET, GOOGLE_AI_API_KEY
# Recommended: GITHUB_TOKEN_FOR_PUBLIC_READS  (unauthenticated GitHub is
#   60 req/hr, which the agent exhausts in about two cases)
npm run seed

npm run eval -- --pipeline baseline
npm run eval -- --pipeline agent
npm run eval                       # both, one report
```

**Expected output.** A progress line per case, then a comparison table, then two
files in `backend/evals/results/`: `results-<timestamp>.json` (every per-case
number) and `results-<timestamp>.md` (the tables above, plus the per-case file
lists).

**Runtime and cost.** Roughly 20–60 s per case for the agent and 5–15 s for the
baseline, dominated by free-tier rate limits rather than compute. Six starter
cases, both pipelines: expect 5–12 minutes. **Monetary cost is zero** — every
model in the default chains is on a free tier. GitHub API usage is roughly 15–25
requests per agent case, so an unauthenticated run will hit the 60/hr limit
partway through; the PAT is not optional in practice.

**What varies between runs.** Free-tier routing is non-deterministic by design
(Power-of-Two-Choices, plus failover on rate limits), so the specific model
answering a given call differs run to run, and scores move by roughly ±0.05.
Rank ordering should be stable; if it is not, that instability is itself the
finding and belongs in the report. Run the set three times before drawing a
conclusion from a difference smaller than the spread.

---

## Main failure mode

**A model will cite a file that does not exist, at a line number that does not
exist, in support of a claim it invented — and the prose around it reads exactly
like the prose around a true claim.** Nothing in the output distinguishes them.
Fluency is not correlated with grounding, and human readers use fluency as the
proxy because there is nothing else to use.

Only two of the three obvious defences work.

*Asking for citations* helps, but not for the reason people expect. It does not
make claims true; it makes them **checkable**, which is a different and better
property.

*Asking the model to double-check itself* is close to worthless. The same
context that produced the claim produces the confirmation.

*Mechanically resolving the citation against files the agent demonstrably
opened* works, and it is nearly free. Most fabrications fail on the cheapest
check — the file was never read — before any second model is involved.

## Hot take

**Verification is only worth building if it is allowed to delete things, and
the deletions are shown to the user.**

A verifier that can rewrite a weak claim into a defensible one is just another
generator, and its output needs verifying in turn. A verifier that silently
drops claims is unfalsifiable — the user cannot tell a strict system from one
that never fires. The value is in the asymmetry: it can only remove, and what
it removed is on screen with the reason.

That constraint also produces the honest score. Groundedness — how much of the
review survived — is a measurement the system makes about *itself*, and it is
the right thing to shrink a score toward the deterministic anchor with. A
system that cannot support what it said should not be as confident as one that
can, and it now says so in a number.

The thing I would carry into the next agent: **make the agent's output shaped so
a cheap deterministic check can reject it.** Not "ask for structured output" —
ask for output whose claims point at something you already have and can look up.
Most of the value came from `file exists && line in range`, which costs nothing
and needs no model at all. The expensive semantic check only earns its place on
the claims that survive the cheap one.
