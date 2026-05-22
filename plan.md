# Cairn

> Personalized AI learning and career engine for aspiring developers and tech career-switchers.
>
> Turn the internet's chaos of free tutorials into a 90-day path that adapts to your starting point and target role, holds you accountable, verifies your projects, and converts your work into a recruiter-ready portfolio.

---

## Table of contents

1. [Why Cairn exists](#1-why-cairn-exists)
2. [Who it's for](#2-who-its-for)
3. [What it does — the three loops](#3-what-it-does--the-three-loops)
4. [Why it survives the brand-trust problem](#4-why-it-survives-the-brand-trust-problem)
5. [Why it compounds (the moat)](#5-why-it-compounds-the-moat)
6. [Pricing & business model](#6-pricing--business-model)
7. [Tech stack](#7-tech-stack)
8. [System architecture](#8-system-architecture)
9. [Data model](#9-data-model)
10. [AI orchestration layer](#10-ai-orchestration-layer)
11. [Free-tier service map](#11-free-tier-service-map)
12. [Distribution strategy](#12-distribution-strategy)
13. [12-week build plan](#13-12-week-build-plan)
14. [Risks and honest critiques](#14-risks-and-honest-critiques)
15. [Why this wins](#15-why-this-wins)

---

## 1. Why Cairn exists

The market signal is unambiguous. India needs roughly one million AI professionals by 2027 and has fewer than 500K today. Globally, AI-related job postings are up ~98% year over year. The hiring lens has shifted from "where did you study" to "what have you shipped, and can you prove it."

Despite this, the path from "I want to be an AI engineer" to "I got the offer" remains unmanaged for most learners. The internet has every tutorial, every free course, every YouTube playlist — and that's exactly the problem. Three failure modes dominate:

- **Path paralysis.** Learners spend two weeks deciding what to learn instead of learning. Static roadmaps (roadmap.sh and clones) describe the destination but don't adapt to where the learner is starting from or what's realistic in their timeline.
- **No accountability.** A free Coursera course has 13% completion rates because nobody is watching. Learners ghost their own goals.
- **No proof-of-work.** GitHubs full of tutorial-following clones don't get interviews. There's no system that says "here are three verified, original, evaluated projects that demonstrate this person can do X."

The current alternatives address one of three, never all three:

| Existing option | Path | Accountability | Proof-of-work |
|-----------------|------|----------------|---------------|
| roadmap.sh + YouTube | Static | None | None |
| Coursera / Udemy | Generic | None | Cert only |
| Scaler / Bosscoder bootcamps (₹3L+) | Strong | Strong | Strong |
| ChatGPT "make me a roadmap" | One-shot | None | None |

The 100x cheaper, AI-native version of a bootcamp does not exist yet. That's the gap.

---

## 2. Who it's for

Three concentric circles of audience, in order of priority.

**Inner ring (initial GTM):** Indian engineering students and recent graduates aiming for AI/ML, full-stack, or backend roles. Reachable through Indian tech YouTube, LinkedIn India, college coding clubs, and Discord servers. Average willingness to pay: ₹299–499/month. TAM: ~10M+ active learners.

**Middle ring (months 6–18):** Working software developers in India trying to pivot into AI/ML or land remote international roles. Higher willingness to pay (₹599–999/month, $9–15 globally). TAM: ~2M actively job-hunting at any time.

**Outer ring (year 2+):** Global self-taught learners — Latin America, Southeast Asia, Eastern Europe, North America. Same product, different distribution channels. TAM: ~50M globally.

The product is built for the inner ring first. Everything else is the expansion path.

---

## 3. What it does — the three loops

### Loop 1: Path generation

The user states their goal in plain language: *"I want to become an AI engineer at a US-based startup in 6 months. I know Python basics and have built one Flask app."* Cairn extracts the structured profile (current skills, target role, timeline, constraints) and generates a personalized 12-week path with:

- Phases (e.g., Python deep dive → ML fundamentals → LLM apps → System design → Job prep)
- Weekly milestones with specific topics
- Curated free resources per topic (videos, articles, courses, scored by community signal)
- Projects to build per phase (with difficulty and expected hours)
- Knowledge checkpoints (auto-generated quizzes)
- A "north star project" that ties everything together by week 10

The path is not static. It re-plans weekly based on actual progress, struggle points, and external signals (job market trends, what other Cairn users with similar profiles are doing successfully).

### Loop 2: Daily accountability

Once enrolled in a path, the user receives:

- A morning brief (email or WhatsApp): *"Today's focus: complete CNN basics from Andrej Karpathy's video (45 min) + solve 2 image classification problems."*
- Mid-week check-in: *"You committed to finishing the recommendation system project by Friday — how's it going? Stuck on something?"*
- Streak tracking and gentle pressure (no manipulative dark patterns; the loop is honest).
- Adaptive replan: if the user falls behind, Cairn redistributes remaining weeks intelligently rather than guilt-tripping.

The accountability layer is delivered via WhatsApp Business API (Indian market preference) and email (global). Telegram bot as a fallback.

### Loop 3: Proof-of-work verification

This is the differentiator and the engineering depth. For each project the user builds, Cairn:

1. Pulls the GitHub repo (user submits URL after granting OAuth scope).
2. Runs a multi-stage evaluation:
   - Static analysis (structure, README quality, tests, commit history)
   - Code-quality LLM pass (does the code do what the README claims?)
   - Originality check (is this a tutorial clone? Hash-similarity against known tutorial repos)
   - Domain-specific evaluator (for an ML project: are there real model training loops? For a backend: are there auth, persistence, error handling?)
3. Issues a verified credential — a signed proof-of-work entry — that contributes to the user's public Cairn portfolio.
4. Provides specific, actionable improvement feedback.

The output is a **public Cairn profile** at `cairn.dev/u/their-handle` that says: *Verified Python (4 projects), Verified ML basics (2 projects), Verified API design (1 project), 87% knowledge check accuracy across 31 quizzes, 67-day streak, current focus: LLM applications.* This is the URL the user puts on their resume. Every shared profile is a top-of-funnel ad for Cairn.

### Optional fourth loop (job-ready phase)

When the user crosses the readiness threshold (configurable, defaults to: 4+ verified projects, 80%+ knowledge checkpoint accuracy, north-star project complete), Cairn flips into job-application mode:

- Daily job feed filtered by user profile (scraped from public boards: LinkedIn, Wellfound, Y Combinator jobs)
- Per-job resume tailoring (changes summary, highlights relevant projects, adjusts keywords for ATS)
- Per-job cover letter drafts
- Mock interview practice (voice-based, with feedback)
- Negotiation prep when an offer arrives

This loop is the "sticky" phase that drives the highest LTV and the strongest word-of-mouth ("Cairn helped me land my first AI role").

---

## 4. Why it survives the brand-trust problem

This was the killer for the previous proposal (Counterpart). Cairn flips the data flow:

- **What the user gives Cairn:** their goal, their current skills, their GitHub username, their resume (only when job-ready), their progress notes. All of this is information they already share publicly elsewhere.
- **What Cairn gives the user:** structured paths, accountability, evaluated projects, mock interviews, a public portfolio, job leads.

The asymmetry is in the user's favor. Worst case if Cairn vanishes, the user loses some notes and a streak counter; they keep their GitHub, their portfolio, their learned skills. This is the inverse of compliance/legal/financial SaaS, where the user is handing over sensitive material and trust must precede revenue.

No bank-grade trust badge is required to onboard the first 10,000 users.

---

## 5. Why it compounds (the moat)

Three compounding axes, each defensible:

**Personal-data lock-in.** Six weeks of momentum, a verified portfolio, and a public profile URL with social proof are not switching costs the user pays lightly. Even if a competitor launched with identical features at half the price tomorrow, the user wouldn't reset their progress.

**Collective intelligence.** Every user's learning path, struggles, and outcomes feed back into the recommendation engine. After 1,000 users, Cairn knows that learners who started with the same profile as you and chose Tutorial A had a 38% completion rate versus Tutorial B's 71%. This is real data that no static roadmap and no ChatGPT prompt can replicate. The recommendations get strictly better over time, while competitors stay at day one.

**Verified credential network effect.** Once a critical mass of recruiters know that *"verified on Cairn"* means something specific (originality, evaluated, not a tutorial clone), the credential itself becomes valuable. This is the late-game moat — the same dynamic that made GitHub commits a hiring signal.

---

## 6. Pricing & business model

| Plan | India | Global | Includes |
|------|-------|--------|----------|
| Free | ₹0 | $0 | 1 path, weekly digest, basic tracking, 1 project verification/month |
| Pro | ₹299/mo or ₹2,499/yr | $5/mo or $49/yr | Unlimited projects, mock interviews, daily nudges, job feed, ATS-optimized resume tailoring |
| Career | ₹599/mo or ₹4,999/yr | $9/mo or $89/yr | Everything in Pro + 1-on-1 monthly review (AI), priority verification, referral connections |

Three-tier rationale: free tier is the funnel and viral loop, Pro is the modal user (students, career-switchers), Career is the conversion at job-search time. ARPU target: ~₹350 ($5.50) blended.

Annual plans are deliberately a strong discount because the product earns its value over months, not weeks. Razorpay for India payments (UPI + cards), Stripe for global.

**Unit economics at modest scale:** 5,000 paid users × ₹350 ARPU = ₹17.5 lakh MRR (~$21K MRR). At this scale, variable costs are still negligible (~₹2/user/month for LLM overages above free tiers, ~₹3 for storage/compute, ~₹10 for WhatsApp Business API messages if used). Gross margin: 95%+.

---

## 7. Tech stack

Picking deliberate, boring technology that a solo dev can actually maintain. MERN as requested for the user-facing layer, Python for the AI/ML core, free-tier hosting throughout.

### Frontend

- **Next.js 15** (React 19) on **Vercel** free tier. SSR for SEO on the public portfolio pages. App Router.
- **TailwindCSS** + **shadcn/ui** for design system. Lucide icons.
- **TanStack Query** for server state, **Zustand** for client state.
- **MDX** for course/resource content that Cairn curates inline.

### API gateway / BFF (Node.js)

- **Express.js** (or **Hono** for edge compatibility) on **Fly.io** or **Railway** free tier.
- Handles auth, request validation, rate limiting, and orchestrates calls to Python AI services.
- **Zod** for input validation.
- **Better-Auth** or **Clerk** (free up to 10K MAU) for authentication, including GitHub OAuth.

### AI/ML services (Python)

- **FastAPI** + **Pydantic** v2 for the AI service tier. Async throughout.
- **LangChain** / **LlamaIndex** for retrieval workflows on the resource corpus (used judiciously, not as religion).
- **Instructor** (or **outlines**) for structured LLM outputs with retry.
- **httpx** for outbound API calls to LLM providers.
- **Celery** with Redis broker for background jobs (or **RQ** for simplicity).

### Data layer

- **MongoDB Atlas** free tier (M0, 512MB) — user data, paths, progress, verified credentials. Document model fits the heterogeneous path/progress data well.
- **Supabase** free tier (Postgres + pgvector + Auth + Storage) — structured data: project submissions, evaluations, quiz attempts, embeddings of the resource corpus.
- **Upstash Redis** free tier — caching, queue broker, rate limit counters.
- **Cloudflare R2** — file storage (resume PDFs, project screenshots). 10 GB free, zero egress fees.

### LLM providers (rotated by task — see [section 10](#10-ai-orchestration-layer))

- **Google AI Studio (Gemini 2.5 Flash, Gemma 4)** — generous free tier, the workhorse
- **OpenRouter free tier** — access to Gemma 4 31B, Llama, Qwen, DeepSeek free variants
- **Groq free tier** — Llama 3.3 70B, Gemma 4 at hardware-accelerated speeds; used for latency-sensitive paths
- **Cerebras free tier** — extremely fast inference for bulk batch passes
- **Together AI free tier** — fallback when others rate-limit
- **Hugging Face Inference API** — for specialized models (code embeddings, originality detection)

### External integrations

- **GitHub REST API** — repo metadata, commit history, file tree, README
- **Resend** — transactional email (3K free/month)
- **WhatsApp Business Cloud API** (Meta) — Indian-market nudges (1K free conversations/month under utility category)
- **Telegram Bot API** — free, fallback for users without WhatsApp Business preference
- **Razorpay + Stripe** — payments (India + global)
- **PostHog** free tier — product analytics, feature flags
- **Sentry** free tier — error tracking

### DevOps

- Monorepo with **Turborepo** or **Nx** (optional; not required for v1).
- **GitHub Actions** for CI (free for public repos, generous for private).
- **Docker** for service containerization. Fly.io and Railway both deploy from Dockerfiles natively.
- Dotenv + **Doppler** free tier for secrets.

---

## 8. System architecture

### High-level component diagram

```
┌────────────────────────────────────────────────────────────────────┐
│                           USER SURFACES                            │
│  ┌──────────────┐  ┌─────────────┐  ┌──────────────┐  ┌─────────┐  │
│  │   Web App    │  │   Public    │  │   WhatsApp   │  │ Telegram │  │
│  │  (Next.js)   │  │  Portfolio  │  │   Nudges     │  │   Bot    │  │
│  └──────┬───────┘  └──────┬──────┘  └──────┬───────┘  └────┬────┘  │
└─────────┼─────────────────┼─────────────────┼───────────────┼──────┘
          │                 │                 │               │
          ▼                 ▼                 ▼               ▼
┌────────────────────────────────────────────────────────────────────┐
│              API GATEWAY  /  BFF  (Express/Hono)                   │
│  Auth · Rate limit · Validation · Request routing · Webhooks       │
└────┬─────────┬─────────┬─────────┬─────────┬─────────┬────────────┘
     │         │         │         │         │         │
     ▼         ▼         ▼         ▼         ▼         ▼
┌──────┐  ┌──────┐  ┌─────────┐  ┌────────┐  ┌────────┐  ┌──────┐
│ Path │  │Coach │  │  Eval   │  │  Quiz  │  │Intervie│  │ Job  │
│ Svc  │  │ Svc  │  │  Svc    │  │  Svc   │  │ w Svc  │  │Feed  │
│(Py)  │  │(Node)│  │  (Py)   │  │  (Py)  │  │  (Py)  │  │(Py)  │
└───┬──┘  └───┬──┘  └────┬────┘  └────┬───┘  └───┬────┘  └──┬───┘
    │         │         │             │          │          │
    └─────────┴─────────┴─────────────┴──────────┴──────────┘
                              │
                              ▼
              ┌────────────────────────────────┐
              │     LLM ROUTER (Python)        │
              │  Task-based routing across:    │
              │  Gemini · Gemma · Groq         │
              │  Cerebras · Together · HF      │
              └─────────────┬──────────────────┘
                            │
              ┌─────────────┼──────────────┐
              ▼             ▼              ▼
        ┌──────────┐ ┌─────────────┐ ┌─────────────┐
        │ MongoDB  │ │  Supabase   │ │   Redis     │
        │  Atlas   │ │ (PG+vector) │ │  (Upstash)  │
        └──────────┘ └─────────────┘ └─────────────┘
```

### Service responsibilities

| Service | Language | Purpose |
|---------|----------|---------|
| Web App | TypeScript / React | All user-facing pages, onboarding, dashboard, project workspace, public portfolio |
| API Gateway / BFF | Node.js / Express | Single entry point, auth, request shaping, calls Python services |
| Path Service | Python / FastAPI | Generates and re-plans personalized learning paths using LLMs + collective data |
| Coach Service | Node.js | Schedules and sends accountability messages, tracks streaks, replan triggers |
| Eval Service | Python / FastAPI | Verifies GitHub projects, runs static + LLM-based evaluation, issues credentials |
| Quiz Service | Python / FastAPI | Generates adaptive knowledge checks, scores attempts, tracks mastery |
| Interview Service | Python / FastAPI | Mock interview engine, voice transcription, scoring |
| Job Feed Service | Python | Scrapes public job boards, indexes, matches against user profiles |
| LLM Router | Python (library) | Routes each call to the cheapest provider that can handle it within rate limits, with fallback chain |
| Workers | Python (Celery) | Daily/weekly background jobs: progress check, resource crawl, job feed refresh, nudge dispatch |

### Request flow examples

**Onboarding flow:**

1. User submits goal statement on web app.
2. Frontend → API Gateway (validate auth, sanitize input).
3. API Gateway → Path Service `POST /paths/generate` with user profile + goal.
4. Path Service extracts structured profile from natural language (Gemini Flash, structured output).
5. Path Service retrieves similar past learners from MongoDB (vector similarity on profile embedding).
6. Path Service queries Gemma 4 31B with full context (similar learners' paths, available resources, target role) → generates 12-week plan.
7. Path Service persists to MongoDB, returns plan to frontend.
8. Coach Service is notified to schedule daily nudges.

**Project verification flow:**

1. User submits GitHub repo URL.
2. API Gateway → Eval Service `POST /evaluations`.
3. Eval Service authenticates with GitHub (user's OAuth token), pulls repo metadata + key files (README, package.json/requirements.txt, main source files, test files).
4. Stage 1: structural checks (Python, deterministic) — README present? Tests? Commit history? Realistic timeline?
5. Stage 2: originality (HuggingFace inference API for code embeddings, compare against known tutorial repo embeddings stored in Supabase pgvector).
6. Stage 3: domain evaluation (LLM with appropriate context — for ML projects: training loops, evaluation metrics; for backend: auth, persistence, error handling).
7. Synthesis: Gemma 4 31B writes the evaluation report with specific feedback.
8. If passing: credential is signed and added to user's public portfolio. If failing: actionable feedback returned, no credential issued.

**Daily nudge flow (worker, no user request):**

1. Celery beat fires `daily_nudge_dispatch` at user's morning hour (calculated from user timezone).
2. Worker queries MongoDB for active users in this hour.
3. For each user: fetch current path state, today's planned topic, recent activity.
4. Generate personalized nudge text (Gemini Flash, batched).
5. Dispatch via WhatsApp Business API or email based on user preference.
6. Log delivery, track open/response rates in PostHog.

---

## 9. Data model

Hybrid Mongo (document, flexible schema for paths/progress) + Postgres (relational, for evaluations and embeddings).

### MongoDB collections

```javascript
// users
{
  _id: ObjectId,
  email: string,
  handle: string,            // public portfolio URL slug
  githubUsername: string,
  timezone: string,
  preferredChannel: "whatsapp" | "telegram" | "email",
  plan: "free" | "pro" | "career",
  createdAt: Date,
  profile: {
    currentSkills: [{ skill: string, level: 1-5 }],
    targetRole: string,
    timelineWeeks: number,
    weeklyHours: number,
    background: string,        // free-form, used for context
    profileEmbedding: [float]  // for similarity search
  }
}

// paths
{
  _id: ObjectId,
  userId: ObjectId,
  status: "active" | "completed" | "abandoned",
  goal: string,
  generatedAt: Date,
  lastReplanedAt: Date,
  phases: [
    {
      name: string,
      weeks: [number],
      milestones: [
        {
          week: number,
          topic: string,
          resources: [
            {
              resourceId: ObjectId,
              type: "video" | "article" | "course" | "book",
              expectedMinutes: number,
              status: "pending" | "in_progress" | "done" | "skipped"
            }
          ],
          quizId: ObjectId | null,
          status: "pending" | "in_progress" | "done"
        }
      ],
      projects: [{ projectId: ObjectId }]
    }
  ],
  northStarProjectId: ObjectId
}

// progressLog (append-only)
{
  _id: ObjectId,
  userId: ObjectId,
  pathId: ObjectId,
  type: "resource_completed" | "quiz_attempted" | "project_submitted" | "nudge_responded" | "replan_triggered",
  payload: { ... },
  timestamp: Date
}

// credentials (the verified portfolio entries)
{
  _id: ObjectId,
  userId: ObjectId,
  type: "project" | "quiz_mastery" | "milestone",
  title: string,
  evidence: {
    repoUrl: string?,
    quizScores: [float]?,
    evaluationReportId: ObjectId?
  },
  skills: [string],
  issuedAt: Date,
  signature: string           // HMAC-signed to prevent tampering
}
```

### Supabase (Postgres) tables

```sql
-- resources: the curated corpus of free learning content
CREATE TABLE resources (
  id UUID PRIMARY KEY,
  url TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,         -- 'video', 'article', 'course', 'book'
  title TEXT NOT NULL,
  source TEXT,                -- 'youtube', 'medium', 'coursera', etc.
  duration_min INT,
  topics TEXT[],
  language TEXT DEFAULT 'en',
  quality_score FLOAT,        -- derived from user outcomes
  embedding VECTOR(768),      -- for semantic matching
  added_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON resources USING ivfflat (embedding vector_cosine_ops);

-- evaluations: project verification records
CREATE TABLE evaluations (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  repo_url TEXT NOT NULL,
  project_type TEXT NOT NULL,
  stage1_score FLOAT,
  stage2_originality FLOAT,
  stage3_quality_score FLOAT,
  final_score FLOAT,
  passed BOOLEAN,
  feedback TEXT,
  evaluated_at TIMESTAMPTZ DEFAULT NOW(),
  evaluator_versions JSONB    -- which prompts / models were used
);

-- quizAttempts
CREATE TABLE quiz_attempts (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  questions JSONB,
  answers JSONB,
  score FLOAT,
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

-- tutorial_fingerprints: known tutorial repos for originality checks
CREATE TABLE tutorial_fingerprints (
  id UUID PRIMARY KEY,
  source_url TEXT,
  code_embedding VECTOR(768),
  added_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Why the hybrid

The path/progress structure is deeply hierarchical and changes shape as the product evolves — that's Mongo territory. The resource corpus and evaluation records are tabular, joined, and benefit from pgvector for similarity search — that's Postgres territory. Using both is not over-engineering; it's matching the tool to the access pattern.

---

## 10. AI orchestration layer

The router is a small Python module (~300 lines) that every AI service imports. It chooses an LLM per call based on:

1. **Task type** (classification, structured extraction, reasoning, code analysis, conversational coaching).
2. **Quality requirement** (path generation needs the smartest model available; quiz tagging can use a small one).
3. **Latency budget** (mock interview turns need <800ms; daily nudge generation can wait minutes).
4. **Current rate-limit headroom** per provider (tracked in Redis).
5. **Fallback chain** if the chosen provider is down or throttled.

### Task-to-model mapping

| Task | Primary model | Fallback | Why |
|------|--------------|----------|-----|
| Goal-statement parsing | Gemma 4 E4B (free, fast) | Gemini Flash | Small structured extraction |
| Path generation | Gemma 4 31B (256K context, free via OpenRouter or AI Studio) | Gemini 2.5 Pro free tier | Needs reasoning + long context (load similar users' paths) |
| Daily nudge personalization | Gemini Flash | Groq Llama 3.3 70B | Bulk, latency-tolerant |
| Quiz generation | Gemini Flash structured output | Together AI Qwen | Schema-bound JSON |
| Project evaluation stage 3 | Gemma 4 31B | DeepSeek V3 via OpenRouter | Needs code understanding + reasoning |
| Originality embeddings | HF Inference API (CodeBERT) | local sentence-transformers | Need consistent embedding space |
| Mock interview turns | Groq (Llama 3.3 70B) | Cerebras Llama | Latency-critical |
| Mock interview scoring | Gemma 4 31B | Gemini Pro | Reasoning over transcript |
| Resume tailoring | Gemini Flash | Together AI | Templated, batch-friendly |

### Router implementation sketch

```python
# llm_router/router.py
from enum import Enum
from typing import Callable, Optional
import httpx, redis, time, json

class TaskType(str, Enum):
    PARSE_GOAL = "parse_goal"
    GENERATE_PATH = "generate_path"
    NUDGE = "nudge"
    QUIZ = "quiz"
    EVAL_PROJECT = "eval_project"
    INTERVIEW_TURN = "interview_turn"
    INTERVIEW_SCORE = "interview_score"
    RESUME_TAILOR = "resume_tailor"

# ordered fallback chain per task
CHAINS: dict[TaskType, list[str]] = {
    TaskType.PARSE_GOAL: ["gemma_4_e4b", "gemini_flash"],
    TaskType.GENERATE_PATH: ["gemma_4_31b_or", "gemini_25_pro", "deepseek_v3"],
    TaskType.NUDGE: ["gemini_flash", "groq_llama70b"],
    TaskType.QUIZ: ["gemini_flash_json", "together_qwen"],
    TaskType.EVAL_PROJECT: ["gemma_4_31b_or", "deepseek_v3"],
    TaskType.INTERVIEW_TURN: ["groq_llama70b", "cerebras_llama"],
    TaskType.INTERVIEW_SCORE: ["gemma_4_31b_or", "gemini_25_pro"],
    TaskType.RESUME_TAILOR: ["gemini_flash", "together_llama"],
}

r = redis.Redis(host=REDIS_HOST, decode_responses=True)

def is_throttled(provider: str) -> bool:
    """Tracks 429/quota-exceeded responses in a rolling window."""
    key = f"throttle:{provider}"
    return r.exists(key)

def mark_throttled(provider: str, retry_after_sec: int = 60):
    r.setex(f"throttle:{provider}", retry_after_sec, "1")

async def call(task: TaskType, payload: dict, schema: Optional[dict] = None) -> dict:
    last_err = None
    for provider in CHAINS[task]:
        if is_throttled(provider):
            continue
        try:
            return await PROVIDERS[provider].invoke(payload, schema=schema)
        except RateLimit as e:
            mark_throttled(provider, e.retry_after)
            last_err = e
        except ProviderError as e:
            last_err = e
            continue
    raise NoProviderAvailable(last_err)
```

The point: providers come and go, free tier limits change weekly, and the router lets you swap without touching service code. Six months from now this code will route across different providers than today; the calling services won't care.

### Cost ceiling (the failsafe)

Each route also gets a **monthly cost ceiling** in Redis. If free tiers run out mid-month and the only fallback is a paid endpoint, the router refuses the call and the user sees a graceful degradation message rather than the founder seeing a surprise $400 bill. This is non-negotiable for a solo dev at zero budget.

---

## 11. Free-tier service map

A snapshot of monthly usage at 1,000 active users (~3K daily AI calls) and where it sits relative to free tier limits.

| Service | What it does | Free tier (mid-2026) | Usage at 1K users | Headroom |
|---------|--------------|---------------------|-------------------|----------|
| Vercel | Frontend hosting | 100 GB bandwidth, unlimited builds | ~10 GB | Massive |
| Fly.io | API + Python services | 3 shared-cpu VMs, 3GB volume | 3 services, comfortable | OK |
| Railway | Alt for above | $5 free credit monthly | — | Mode B |
| MongoDB Atlas | User/path/progress data | M0 cluster, 512 MB | ~80 MB at 1K users | Good until ~5K users |
| Supabase | Postgres, vector, auth, storage | 500 MB DB, 1 GB storage, 50K MAU auth | ~120 MB DB | Good |
| Upstash Redis | Cache + queue broker | 10K commands/day | ~6K commands | Watch this |
| Cloudflare R2 | File storage | 10 GB, no egress | < 2 GB | Massive |
| Resend | Transactional email | 3K emails/month | ~2K | Tight |
| WhatsApp Business | Nudges (India) | 1K free utility conversations/mo | ~700 | Tight; switch to template-based |
| Gemini API (AI Studio) | LLM workhorse | 1500 req/day on Flash, generous Gemma | Comfortable | Yes |
| OpenRouter free | Gemma 4 31B, Llama, Qwen, DeepSeek | Rate-limited but free models exist | Used for path generation, eval | Manage with router |
| Groq free | Llama / Gemma fast inference | 30 RPM, 7K req/day | Use for interviews only | Tight |
| Cerebras free | Fast Llama / Qwen | Limited but generous batches | Use for bulk passes | Yes |
| Together AI free | Many models | $25 credit on signup, free tiers vary | Fallback only | OK |
| HuggingFace Inference | Embeddings (CodeBERT etc.) | Rate-limited free tier | Originality checks | Tight; cache aggressively |
| PostHog | Product analytics | 1M events/month | ~250K | Massive |
| Sentry | Error tracking | 5K errors/month | ~500 | Massive |
| GitHub Actions | CI | 2K min/month private | ~200 | Massive |
| Razorpay | India payments | No platform fee, charges per txn | — | Pay per use |
| Stripe | Global payments | No platform fee, charges per txn | — | Pay per use |

The pressure points are: Redis commands (cache aggressively, batch where possible), WhatsApp conversations (switch to email for non-Indian users and template-based for Indian users), and Groq RPM (only mock interviews go to Groq). Everything else has 10x+ headroom at 1K users.

At 5–10K users, MongoDB Atlas M0 becomes tight and you upgrade to M10 (~$57/month) — by which point you have ₹35L+/yr ARR and the cost is trivial.

---

## 12. Distribution strategy

No paid acquisition until ₹10L MRR. The product has to spread by outcomes.

### Phase 1: First 100 users (weeks 1–6 post-launch)

- **Build in public on Indian tech Twitter and LinkedIn.** Weekly thread: what you shipped, what you learned, what users said. Tag your audience (engineering students, career switchers).
- **Direct outreach to Indian tech YouTube hosts.** A free Pro tier for their audience in exchange for a mention. Target tier-2 YouTubers (10K–100K subs) first; tier-1 won't respond.
- **r/developersIndia, r/IndianStreetBets-style subreddits** — share honest "I built this and here's what I learned" posts. Not promotional, technical.
- **College CS Slack/Discord channels** — partner with one club at IIT, NIT, BITS for free pilot access. They become evangelists.

### Phase 2: First 1,000 users (weeks 6–20)

- **The public portfolio is the marketing.** Every user with a Cairn portfolio URL on their LinkedIn or resume is an ad. The portfolio page itself has a tasteful "Verified on Cairn" badge that links back. This is the GitHub-commits dynamic — once recruiters see it twice, they're curious.
- **Outcome posts.** Every successful user (got first internship, first job, first US offer) writes a short story. Cairn gives them a template. These become weekly blog posts and tweet threads.
- **WhatsApp/Telegram communities.** Indian tech communities live there. Cairn-themed daily challenges drive engagement without spam.
- **SEO on long-tail queries.** "AI engineer roadmap for ECE graduate", "How to switch from manual testing to ML in 2026", "Best free courses for backend Java to AI" — each gets a Cairn-authored guide, each guide links to a relevant starter path.

### Phase 3: Scaling (months 6–18)

- **Refer-a-friend with credit.** Both sides get a month free. Solo dev's friction-light virality, not MLM.
- **Bootcamp partnership flip.** Bootcamps charge ₹3L. Cairn at ₹3.6K/year is 80x cheaper. Position the comparison directly.
- **University tie-ups.** Free Pro for verified students in exchange for using Cairn as the "official" extracurricular path. Pays off when students who graduate continue paying.
- **Global expansion.** Same product, Spanish + Portuguese + Bahasa + Vietnamese onboarding flows. Same TAM logic in each market.

### What not to do

- Don't run paid ads until product retention is proven. Free-tier-to-paid conversion is the only metric that matters until then.
- Don't position against bootcamps in your messaging until you have 1,000 success stories. They'll outspend you in any direct fight; let the cost arbitrage speak for itself.
- Don't build a course marketplace. Cairn curates free content from the web; becoming a marketplace muddies the model and invites lawsuits.

---

## 13. 12-week build plan

A solo dev with strong engineering can ship v1 in 10–12 weeks. The order matters; resist the urge to reorder.

### Weeks 1–2: Foundation

- Repo, CI, deploy pipelines (Vercel + Fly.io + GitHub Actions).
- Auth + onboarding flow (Better-Auth or Clerk, GitHub OAuth).
- Schema: users, paths, resources tables/collections.
- LLM router with 3 providers + Redis throttle tracking.
- Skeleton frontend with three pages: onboard, dashboard, profile.

### Weeks 3–4: Path generation (Loop 1)

- Path Service: goal parsing, similar-user retrieval (cold start: use synthetic seed data for first 50 users), path generation prompt engineering.
- Resource corpus seeding: write a one-time crawler for ~500 high-quality free resources across the priority topics (Python, ML, GenAI, system design, frontend basics). Manual quality scoring.
- Path display UI: phases, weeks, today's focus card.

### Weeks 5–6: Daily accountability (Loop 2)

- Coach Service: scheduled nudges, streak tracking.
- Email integration (Resend) first; WhatsApp Business after email is solid.
- User progress logging (every action appended to progressLog).
- Replan trigger: if user is 7+ days behind, queue a path re-plan.

### Weeks 7–8: Project verification (Loop 3)

- GitHub OAuth scope upgrade for private/public repo read.
- Eval Service: 3-stage pipeline (structure, originality, domain quality).
- Tutorial fingerprints: seed with ~200 known tutorial repos (the usual freeCodeCamp / Patrick Loeber / Sentdex stuff). Embed and store.
- Public portfolio page with verified credentials.

### Weeks 9–10: Polish + alpha launch

- Quiz Service: adaptive quiz generation tied to milestones.
- Onboarding refinement: get from sign-up to first nudge in 3 minutes.
- 20 hand-picked alpha users from your network.
- Build the public portfolio's social-sharing affordance (OG images, copy-link button, "share my profile" CTA).

### Weeks 11–12: Public launch + iterate

- Public launch on Indian tech Twitter, Indian Hackers, r/developersIndia.
- Add Razorpay payment for Pro tier; gate advanced features behind it.
- Mock interview MVP (just text-based at first; voice in v1.1).
- First "outcome post" — a real user who got an interview after a Cairn path.

### What's explicitly NOT in v1

- Mobile native apps (PWA is fine).
- Multi-language (English-only at launch, even for Indian users — most coding learners read tech English).
- Job feed (added in month 4–5).
- Community/forum features (added when there's something to talk about).
- Live mentorship marketplace (not in roadmap — it's a different business).

---

## 14. Risks and honest critiques

These are the things that have killed similar products. Naming them so you can plan for them.

### Risk 1: ChatGPT can already do most of this

A user can ask GPT-4 to make them a roadmap, generate quiz questions, and evaluate their project. **Why pay for Cairn?**

The honest answer: ChatGPT does it once per prompt with no memory, no follow-up, no accountability, no verification, no portfolio, no compounding. Cairn is the wrapper around ChatGPT-like capability that turns episodic AI use into a system. The bet is that **system** is the product, not the model. This is the same reason people pay for Linear when they could use a notes app, or Calendly when they could send time options manually.

### Risk 2: Content quality at scale

Curating high-quality free resources is hard, and bad recommendations damage trust faster than good ones build it. **The plan:** start with a small, hand-curated corpus (~500 items) for the priority topics. Add user feedback loops (every resource gets a thumbs-up/down after they complete it). Use the collective signal to score quality over time. Don't try to be exhaustive; be opinionated.

### Risk 3: Project evaluation false positives

If the eval pipeline says a tutorial clone is "verified original work," the credential becomes worthless. **The plan:** be aggressive on false positives, accept false negatives. Better to under-issue credentials than over-issue. Manually review the first 200 evaluations to calibrate the prompts. Keep a "needs human review" queue indefinitely.

### Risk 4: Bootcamp competition

Scaler, Bosscoder, Newton School, Masai will see this and respond. **The plan:** they won't go below ₹50K/year because that breaks their model. Cairn's ₹300–600/month is structurally cheaper than they can match. Their advantage is brand and live mentors; Cairn's is scale, personalization, and price. Stay narrow on what Cairn does well; don't try to add live mentors.

### Risk 5: The one-time-use problem (lost users post-job)

Once a user lands a job, do they still pay? **The plan (post-v1):** add a "Career" tier focused on continuous learning, skill expansion, and the next job search. Most engineers job-hop every 2–3 years. The portfolio becomes their permanent professional asset, and Cairn becomes the maintenance system. Pivot from "first job" framing to "career operating system" by month 18.

### Risk 6: Trust in AI-issued credentials

Recruiters might not trust "Verified on Cairn" the way they trust GitHub stars or LeetCode rating. **The plan:** start with the credential being a quality signal *next to* the user's GitHub repo link, not a replacement. The repo is the evidence; Cairn is the curation layer. Over time, as more recruiters see consistent quality from Cairn-verified candidates, the credential gains weight. This is a years-long effort, not a launch feature.

### Risk 7: India payment friction

Indian users hate annual commitments and credit cards. UPI is the only payment they trust. **The plan:** Razorpay handles UPI natively; the monthly plan is the default; the annual plan is presented as "₹300/month if billed monthly, ₹208/month if billed annually" — never as a single ₹2,499 charge.

### Risk 8: Solo dev burnout

This is real. Building all of this alone is a marathon. **The plan:** ruthless scope cuts. Mock interview is not in v1. Job feed is not in v1. WhatsApp can be replaced with email. The 12-week plan above already assumes 30+ hours/week of focused work. If life intervenes, extend the plan, don't expand the scope.

---

## 15. Why this wins

- **Real, urgent pain.** Millions of Indian engineers staring at the AI hiring boom with no clear path. Same dynamic playing out globally with weaker free alternatives.
- **No brand-trust barrier.** Users get value before giving anything sensitive. Brand emerges from outcomes, not from a SOC2 badge.
- **Compounds on three axes.** Personal data lock-in, collective intelligence, credential network effect — each defensible independently, devastating together.
- **Free-tier sustainable for a long runway.** At 1K paid users (~₹3L MRR) the variable cost is under ₹5K/month. Real path to profitability without a single VC dollar.
- **Distribution is built into the product.** Every Cairn portfolio is a marketing asset. Every success story is content. The audience already lives on platforms a solo founder can reach for free.
- **Engineering depth that matches a strong developer's interests.** Real systems — retrieval, multi-provider LLM orchestration, project evaluation pipelines, structured generation, voice interfaces — not just a CRUD app with a chat box.
- **The 100x price arbitrage is honest, not aspirational.** Bootcamps charge ₹3 lakh because they have buildings, hiring teams, and live mentors. Cairn charges ₹3.6K/year because it doesn't need any of that. The economics work out because the user doesn't pay for what they don't need.
- **The end-game is large.** Once Cairn has 100K active users globally, the verified-credential layer becomes its own platform. Recruiters pay to filter by Cairn signal. Employers sponsor specific paths. Universities embed Cairn into their CS curriculum. None of that is in v1; all of it is unlocked by the v1 doing its job.

---

## Appendix: starter prompts

A few of the core LLM prompts (sanitized) to show what the engineering really looks like under the hood.

### Path generation prompt (Gemma 4 31B)

```
SYSTEM: You are an expert career coach generating a personalized learning path
for a developer. You have access to {N} similar-profile learners' actual
completed paths and their outcomes. Use these as evidence of what works, not
as templates to copy. Prefer concrete projects over passive content.

CONTEXT:
- Learner profile: {profile_json}
- Target role: {target_role}
- Timeline: {weeks} weeks at {hours_per_week} hours/week
- Available resources for matched topics: {resource_corpus_subset}
- Similar past learners: {similar_paths_with_outcomes}

INSTRUCTIONS:
Output a path as JSON matching this schema: {path_schema}

Rules:
1. Every milestone must have a concrete deliverable (project, problem set, or
   knowledge check), not just "study X".
2. Allocate at most 60% of time to consumption; 40% must be active work.
3. Phase order: foundations → applied → portfolio → interview prep.
4. The north-star project must integrate skills from ≥3 phases.
5. If a topic has multiple resources, choose based on past completion rates,
   not popularity.
6. Be realistic about hours; if the goal is infeasible in the timeline, set a
   "stretch_goal_warning" field with a brief honest note.

OUTPUT: JSON only, no preamble.
```

### Project originality check (CodeBERT + LLM)

```python
# pseudocode
def check_originality(repo_files: list[File]) -> OriginalityScore:
    embeddings = code_embed(repo_files)  # HF inference API
    
    nearest = pgvector_search(
        embeddings, 
        table="tutorial_fingerprints", 
        top_k=5
    )
    
    max_similarity = max(n.similarity for n in nearest)
    
    if max_similarity > 0.92:
        return OriginalityScore(score=0.0, flagged=True, matches=nearest)
    
    if max_similarity > 0.75:
        # ambiguous: send to LLM for context-aware verdict
        verdict = llm_router.call(
            TaskType.EVAL_PROJECT,
            payload={
                "user_repo_summary": summarize(repo_files),
                "potential_match_summary": summarize(nearest[0].source),
                "ask": "Is the user's repo a derivative of the reference, or independent work that happens to be in the same domain?"
            }
        )
        return OriginalityScore(
            score=1.0 - max_similarity,
            flagged=(verdict["is_derivative"]),
            reasoning=verdict["reasoning"]
        )
    
    return OriginalityScore(score=1.0 - max_similarity, flagged=False)
```

### Mock interview turn (Groq for latency)

```
SYSTEM: You are a senior engineer at a fast-growing startup conducting a
{role}-position interview. The candidate's level is {junior|mid|senior}.

Behavior:
- Ask one question at a time.
- After their answer, decide: probe deeper, move to next topic, or wrap up.
- If they're stuck for >60s, offer a small hint, not the answer.
- Don't be sycophantic. Mirror real interviewer behavior.
- After 25 min of conversation, conduct wrap-up.

CONTEXT: {candidate_profile, current_topic, conversation_so_far}

OUTPUT: Just your next message. No meta commentary.
```

---

*This document is a living plan. Update it as the product evolves; don't treat it as a contract.*