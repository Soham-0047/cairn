# Cairn — Gemma 4 Powered Learning + Career Engine

> Submission for the [Gemma 4 Challenge](https://dev.to/) — Build With Gemma 4 track.
>
> A personalized AI learning + career engine that turns the internet's chaos of free tutorials
> into a 12-week path, verifies your projects (text **and** screenshots), and builds you a
> recruiter-ready public portfolio.

---

## Why this is a Gemma 4 submission

The judging criteria for "Build With Gemma 4" emphasize **intentional and effective use of Gemma 4**. Cairn uses three different Gemma 4 variants for three different jobs in the same product:

| Job | Model | Why this variant |
|---|---|---|
| Parse a free-form learning goal into structured profile | **Gemma 4 4B** | Small, fast — runs the request in ~600ms on Google AI Studio's free tier |
| Generate the 12-week personalized path | **Gemma 4 27B** | Needs heavy reasoning + long context to load 50+ resources & similar-learner data |
| Code review of submitted GitHub repos | **Gemma 4 27B** | Reasoning over multi-file source code |
| **Multimodal review of project screenshots** ⭐ | **Gemma 4 12B (vision)** | Native vision capability — looks at the actual UI |

The whole orchestration runs through a **provider-agnostic router** with automatic fallback to Gemini / DeepSeek / Llama when free-tier rate limits hit. Editing one file (`backend/src/llm/providers/registry.ts`) swaps the entire model lineup — by design, so this codebase can be re-purposed for the next Llama/Qwen/Mistral hackathon without touching business logic.

The **multimodal eval** (Stage 3) is the hero feature: upload up to 4 screenshots of your running app alongside the GitHub repo, and Gemma 4 12B compares what the code claims against what the UI actually looks like.

---

## Architecture at a glance

```
frontend/ (Next.js 15 · React · TypeScript · Tailwind)
   ├── /                     → Landing (server-rendered, configured by SiteConfig)
   ├── /onboarding           → Free-form goal → structured profile (Gemma 4 4B)
   ├── /dashboard            → 12-week path with progress tracking
   ├── /projects/new         → Submit GitHub repo + optional screenshots (HERO)
   ├── /projects/[id]        → Multi-stage evaluation results
   ├── /u/[handle]           → Public portfolio (SSR, recruiter-shareable)
   ├── /example              → Static demo portfolio (no signup needed)
   └── /admin                → CMS for everything — see below
        ├── /admin/site      → Brand name, logo, colors, hero copy, SEO, feature flags
        ├── /admin/providers → Reorder LLM chains per task; test routes live
        ├── /admin/resources → Curate the learning-resource corpus
        └── /admin/strings   → Free-form UI string overrides

backend/ (Express · TypeScript · MongoDB · Mongoose)
   ├── llm/                  → Provider-agnostic router with fallback chains
   │   ├── router.ts         → Per-task routing + throttle tracker + call tracing
   │   ├── providers/        → Google AI Studio, OpenRouter, Groq, Cerebras, Together
   │   └── prompts.ts        → All prompt templates
   ├── services/
   │   ├── path.service.ts   → Goal parsing + path generation
   │   ├── eval.service.ts   → 3-stage multimodal evaluation pipeline
   │   └── github.service.ts → Repo snapshot via Octokit
   ├── models/               → User, Path, Evaluation, Credential, Resource, SiteConfig
   └── routes/
       ├── auth.ts           → NextAuth ↔ JWT exchange
       ├── paths.ts          → Path CRUD + progress
       ├── evaluations.ts    → Project submission + retrieval
       ├── portfolio.ts      → Public portfolio (no auth)
       ├── config.ts         → Public read of SiteConfig
       └── admin/            → Token-gated CMS routes
```

### The admin panel

Everything that's visible to a user — brand name, logo, primary color, hero title, every CTA, footer note, SEO meta, OG image, feature flags, the entire AI provider routing — is editable at `/admin` without touching code or redeploying. The admin gate is a single `ADMIN_SECRET` env-var token (sufficient for solo-founder/hackathon ops; trivial to upgrade to NextAuth-allowlist for production).

This makes the whole codebase **hackathon-reusable**: re-skin for a Llama challenge in 30 minutes — change brand + LLM chains in the admin panel.

---

## Quick start

### Prerequisites

- Node.js 20+ (use `nvm use 20`)
- A MongoDB instance — local (`mongod`) or [MongoDB Atlas free M0 cluster](https://www.mongodb.com/cloud/atlas/register)
- A Google AI Studio API key — [get one free](https://aistudio.google.com/apikey) (gives access to Gemma 4 + Gemini)

Optional (for fallback richness):
- OpenRouter API key — Gemma 4 free models + DeepSeek/Llama fallbacks
- Groq API key — fast Gemma/Llama inference
- A GitHub OAuth app for login — [create one](https://github.com/settings/developers)

### Setup

```bash
# Backend
cd backend
cp .env.example .env
# Edit .env — set MONGODB_URI, JWT_SECRET, ADMIN_SECRET, GOOGLE_AI_API_KEY (minimum)
npm install
npm run seed      # seeds the resource corpus + default LLM chains
npm run dev       # starts on :4000

# Frontend (in a separate terminal)
cd frontend
cp .env.example .env.local
# Edit .env.local — set GITHUB_CLIENT_ID/SECRET, NEXTAUTH_SECRET (matches backend JWT_SECRET)
# Important: ADMIN_SECRET in frontend must match ADMIN_SECRET in backend
npm install
npm run dev       # starts on :3000
```

Open http://localhost:3000.

To use the admin panel: open http://localhost:3000/admin and enter the `ADMIN_SECRET` from your backend `.env`.

---

## How the multi-stage evaluation works (the hero feature)

When a user submits a GitHub repo + optional screenshots at `/projects/new`:

```
                    ┌──────────────────────────┐
                    │ POST /api/evaluations    │
                    │ { repoUrl, screenshots } │
                    └────────────┬─────────────┘
                                 │
              ┌──────────────────┴──────────────────┐
              ▼                                     ▼
   Stage 1: Structural (deterministic)    Stage 2: Code review
   ─────────────────────────────────      ────────────────────────
   • README quality                       LLMRouter → Gemma 4 27B
   • Commit count + unique authors        ├ Originality
   • Test presence                        ├ Functionality
   • File-tree size                       ├ Quality
                                          └ Skill match
                                                    │
                                                    ▼
                            Stage 3 (if screenshots): Visual review
                            ─────────────────────────────────────────
                            LLMRouter → Gemma 4 12B (vision)
                            • Does UI match what code claims?
                            • Polish level: shipped / demo / prototype?
                            • Specific findings per screenshot
                                                    │
                                                    ▼
                                       Stage 4: Synthesis
                                       ──────────────────
                                       • Weighted final score
                                       • Pass threshold: ≥0.65 + originality ≥0.55
                                       • If passing: HMAC-signed credential
                                         issued to user's public portfolio
```

Every API call records **which provider and model actually ran** — visible to the user on the eval page. That transparency is part of the "intentional model selection" story for judges.

If Google AI Studio rate-limits, the router automatically falls back to OpenRouter's free Gemma 4 27B endpoint, then to Gemini 2.5 Pro, then to DeepSeek V3. No user-visible failure.

---

## Configurability for future hackathons

The whole product is designed to be retargeted. To submit Cairn to (say) a **Llama 4 Challenge**:

1. **Change one file** — `backend/src/llm/providers/registry.ts` — to point at Llama models on Groq / Together.
2. **Or no file at all** — re-order the chains in `/admin/providers` and Llama becomes the primary.
3. **Re-brand** — change name / logo / colors / hero copy in `/admin/site`.

Total time to re-submit: ~30 minutes.

---

## Production checklist (already done)

- ✅ TypeScript strict mode everywhere
- ✅ Helmet + CORS + rate limiting on backend
- ✅ Zod input validation on every endpoint
- ✅ Pino structured logging
- ✅ Per-request error boundaries
- ✅ JWT auth with HMAC-signed credentials
- ✅ Admin gate (env-token; upgradeable to allowlist)
- ✅ SSR + revalidation on portfolio for SEO + low latency
- ✅ Mobile-responsive UI (Tailwind)
- ✅ Frontend production build passes (13 routes)
- ✅ Backend typechecks clean
- ✅ Free-tier-friendly (every paid hop is optional)
- ✅ Canonical URLs, sitemap, robots.txt and JSON-LD structured data
- ✅ `llms.txt` / `llms-full.txt` for AI answer engines
- ✅ Generated OG/Twitter share card (no binary asset to maintain)

---

## Domains, DNS and deployment

The app is served from **https://cairn.sohamdev.com**. Cloudflare holds DNS for
`sohamdev.com`; Netlify serves the frontend and Render serves the API.

```
Browser → Cloudflare (DNS only) → Netlify (Next.js) → Render (Express API)
                                        cairn.sohamdev.com
```

### The URL lives in exactly three places

| Where | Key | Value |
|---|---|---|
| Netlify env | `NEXT_PUBLIC_SITE_URL` | `https://cairn.sohamdev.com` |
| Netlify env | `NEXTAUTH_URL` | `https://cairn.sohamdev.com` |
| Render env | `FRONTEND_URL` | `https://cairn.sohamdev.com` |

`NEXT_PUBLIC_SITE_URL` feeds `frontend/src/lib/site.ts`, which is the single
source of truth for canonical tags, the sitemap, `robots.txt`, OG tags and
structured data. Nothing else hardcodes the hostname.

While more than one hostname is live, list the extras on the API in
`EXTRA_CORS_ORIGINS` (comma-separated) so browser calls from them are not
blocked by CORS.

### Netlify + Cloudflare setup

Follows Playbook A of the `sohamdev.com` domains runbook. **Order matters — add
the domain in Netlify first.** If Netlify rejects the name, you find out before
spending a DNS record on it.

1. **Netlify → Domain management → Add a domain** → `cairn.sohamdev.com`.
   Netlify will warn that DNS doesn't point here yet. That's expected.
2. **Cloudflare → DNS → Add record**
   - Type `CNAME`, Name `cairn`, Target `cairnetlify.netlify.app`
   - **Proxy status: DNS only (grey cloud)**
   - TTL Auto
3. Wait 1–5 min for Netlify to provision the Let's Encrypt cert (Domain
   management → HTTPS → *Verify DNS configuration* if impatient).
4. **Set it as the primary domain in Netlify.** This is the SEO switch — it is
   what generates the 301 from `cairnetlify.netlify.app`. Without it you have two
   live, competing copies of the site. Netlify writes this redirect itself;
   there is deliberately no rule for it in `netlify.toml`.

**Grey cloud, permanently.** Not just during cert issuance. Netlify terminates
TLS with its own cert and is already a CDN; turning on Cloudflare's proxy adds a
second TLS layer for no gain and breaks ACME renewal. Never point the
nameservers at Netlify either — the zone also holds the Cloudflare Email Routing
`MX`, `SPF` and `DKIM` records, so moving it silently kills `@sohamdev.com` mail.

The apex `sohamdev.com` serves the portfolio and is **not** redirected here.

Confirm:

```bash
dig +short cairn.sohamdev.com                  # → cairnetlify.netlify.app.
curl -sI https://cairn.sohamdev.com | head -3  # → HTTP/2 200, server: Netlify
curl -sI https://cairnetlify.netlify.app  | head -1   # → 301 (NOT 200)
curl -sI https://cairn.sohamdev.com | grep -i cf-ray   # → empty = grey cloud
```

### OAuth callbacks

Both providers must list the production callback or sign-in breaks with a
redirect-URI mismatch:

- GitHub → *Settings → Developer settings → OAuth Apps* →
  `https://cairn.sohamdev.com/api/auth/callback/github`
- Google → *Cloud Console → Credentials* → authorized redirect URI
  `https://cairn.sohamdev.com/api/auth/callback/google`, and authorized
  JavaScript origin `https://cairn.sohamdev.com`

---

## SEO

Search and answer-engine surface area lives in a few well-defined places:

| File | Serves | Purpose |
|---|---|---|
| `frontend/src/lib/site.ts` | — | Canonical URL, keywords, FAQ copy, public route list |
| `frontend/src/app/layout.tsx` | every page | Title template, canonical, OG/Twitter, robots directives |
| `frontend/src/app/robots.ts` | `/robots.txt` | Crawl rules; AI crawlers opted in explicitly |
| `frontend/src/app/sitemap.ts` | `/sitemap.xml` | Public routes only |
| `frontend/src/app/opengraph-image.tsx` | `/opengraph-image` | Generated 1200×630 share card |
| `frontend/src/components/JsonLd.tsx` | every page | Organization, WebSite, SoftwareApplication, FAQPage, ProfilePage |
| `frontend/public/llms.txt` | `/llms.txt` | Short product summary for LLM crawlers |
| `frontend/public/llms-full.txt` | `/llms-full.txt` | Long-form reference |

Authenticated routes (`/dashboard`, `/settings`, `/projects`, `/quizzes`,
`/interviews`, `/onboarding`, `/admin`) are excluded from the index both in
`robots.txt` and with a per-route `noindex` meta tag.

The landing-page FAQ and the `FAQPage` structured data are generated from the
same `FAQ_ITEMS` array, so a rich result can never advertise an answer the page
does not show.

### After deploying

1. **Google Search Console — nothing to verify.** The Domain property on
   `sohamdev.com` (DNS TXT) already covers every present and future subdomain,
   so `cairn.sohamdev.com` is included. `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`
   exists only as an escape hatch if an HTML-tag verification is ever needed;
   leave it unset. Bing Webmaster Tools can import the Search Console property.
2. Submit `https://cairn.sohamdev.com/sitemap.xml` under that property.
   Then link the site from the portfolio — that link is Google's main discovery
   path to a new subdomain.
3. Confirm the SEO title and description in `/admin/site` — an existing
   `SiteConfig` document in Mongo keeps whatever values it was created with,
   and those override the code defaults.
4. Check the rich results at
   `https://search.google.com/test/rich-results`.

---

## Hackathon submission template (Build With Gemma 4)

Use the text below to fill the DEV submission form.

### What I built

Cairn is a personalized AI learning + career engine. A user states their goal in plain English ("I want to become an AI engineer in 6 months — I know Python basics"), and Gemma 4 builds them a 12-week path: phases, weekly milestones with deliverables, curated free resources, and projects to build. As they ship projects, Cairn pulls their GitHub repo and runs a multi-stage evaluation — code review with Gemma 4 27B, and a **multimodal visual review with Gemma 4 12B** that looks at screenshots of the running app. Verified projects become HMAC-signed credentials on a public, recruiter-shareable portfolio.

### Which Gemma 4 model and why

Three Gemma 4 variants, each for the job that fits its profile:

- **Gemma 4 4B** — goal-statement parsing. Small + fast extraction of structured profile from free text. Sub-second latency, runs many times per onboarding session.
- **Gemma 4 27B** — path generation and code review. Heavy reasoning + long context (loads the resource corpus + similar past learners + the user's full code in one prompt). The 128K context window matters here.
- **Gemma 4 12B (vision)** — multimodal project screenshot review. This is the hero — same model handles text + images, and the visual review reliably catches "looks polished but the code is sloppy" and "code is good but the UI is a placeholder" mismatches.

The full chain for each task is editable at runtime via the admin panel, so the routing decisions are transparent + tweakable.

### Tech stack

- Frontend: Next.js 15 (App Router, SSR), React 18, TypeScript, Tailwind, NextAuth (GitHub OAuth)
- Backend: Node.js 20, Express, TypeScript, Mongoose, MongoDB
- LLM routing: custom provider-agnostic router with fallback chains, throttle tracking, and per-task config
- Providers (Gemma 4 first; Gemini / DeepSeek / Llama as automatic fallbacks): Google AI Studio, OpenRouter, Groq, Cerebras, Together AI

### Live demo

- Hosted: _https://cairn.sohamdev.com_
- Example portfolio: _https://cairn.sohamdev.com/example_
- GitHub: _https://github.com/Soham-0047/cairn_

---

## License

MIT — use this codebase as a starter for any AI-product hackathon. Attribution welcome but not required.
