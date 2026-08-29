# Cairn

**A learning path you can follow, and a project review you can argue with.**

Cairn turns a plain-English career goal into a 12-week path, then verifies the
projects you build along the way — reading your repository the way a senior
engineer would, and showing you its working. Projects that hold up become
signed credentials on a public portfolio a recruiter can check without an
account.

---

## The problem this solves

Someone teaching themselves to code can find a thousand tutorials and no
answer to the only question that matters: **is what I just built any good?**

The feedback they can get today is all bad in a different way:

| Where they ask | What they get |
|---|---|
| A friend or mentor | Good, but slow, rationed, and most people don't have one |
| A code-review bot | Style and lint. Nothing about whether the project is real work |
| Posting it online | Silence, or one person's taste stated as fact |
| Asking a chatbot | A confident review of a repository it mostly did not read |

That last one is the trap, and it is the one this project is about. Paste a
repository URL into a chat window and you get a fluent, specific-sounding
review. Check the details and a good share of them are about code that isn't
there. The output is indistinguishable from a real review right up to the point
where you act on it.

**The bottleneck is not generating a review. It is generating one whose claims
can be checked.** Cairn's answer: an agent that chooses what to read, three
reviewers that judge it separately, and a verification pass that drops anything
the source doesn't actually show — including its own findings.

Who this is for: self-taught developers and bootcamp graduates with no senior
engineer to ask, and the recruiters who need to tell a real portfolio from a
row of tutorial clones.

---

## How the review works

Submitting a repository runs a five-phase workflow. Each phase is a separate
router task, so the model behind each one is tuned independently.

```
  ┌─ investigate ────────────────────────────────────────────────┐
  │  An agent with read-only repository tools:                   │
  │    list_files · read_file · search_code                      │
  │    read_history · read_manifest                              │
  │  It forms a hypothesis, reads what would change its mind,    │
  │  and must cite a file and line for every finding.            │
  └──────────────────────────┬───────────────────────────────────┘
                             ▼
  ┌─ structural signals ─────────────────────────────────────────┐
  │  Computed from the repository, never asked of a model:       │
  │  README depth · test files · source size · commit pattern    │
  │  project hygiene · Dependabot alerts                         │
  │  This is the anchor the score falls back toward.             │
  └──────────────────────────┬───────────────────────────────────┘
                             ▼
  ┌─ three reviewers, in parallel ───────────────────────────────┐
  │  originality  — your work, or a tutorial followed?           │
  │  craft        — would you merge this?                        │
  │  skill match  — do the claimed skills appear in the code?    │
  │  Separate lenses, so a polished clone can score well-built   │
  │  and unoriginal at the same time.                            │
  └──────────────────────────┬───────────────────────────────────┘
                             ▼
  ┌─ verify ─────────────────────────────────────────────────────┐
  │  Every claim is re-read against the lines it cites.          │
  │  Mechanical check: does that file exist, was it opened,      │
  │  does that line number exist?                                │
  │  Semantic check: do those lines actually show this?          │
  │  Anything unsupported is dropped before it is scored.        │
  └──────────────────────────┬───────────────────────────────────┘
                             ▼
  ┌─ synthesise ─────────────────────────────────────────────────┐
  │  The written review, built only from surviving claims.       │
  │  Score = weighted components, shrunk toward the structural   │
  │  anchor in proportion to how much failed verification.       │
  └──────────────────────────────────────────────────────────────┘
```

Screenshots, when supplied, are reviewed by a vision model concurrently with
the investigation and enter as one more weighted component.

**Everything above is visible in the product.** The results page shows the
agent's tool calls with its reasoning, every claim with its verdict — including
the discarded ones and why — and how each component was weighted. A user who
disagrees with their score can see exactly which step to argue with.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the design decisions and
[EVALUATION.md](EVALUATION.md) for how it is measured against a baseline.

---

## Architecture at a glance

```
frontend/ (Next.js 15 · React · TypeScript · Tailwind)
   ├── /                     → Landing (server-rendered, configured by SiteConfig)
   ├── /onboarding           → Free-form goal → structured profile
   ├── /dashboard            → 12-week path with progress tracking
   ├── /projects/new         → Submit a GitHub repo + optional screenshots
   ├── /projects/[id]        → Live agent run, evidence ledger, score breakdown
   ├── /u/[handle]           → Public portfolio (SSR, recruiter-shareable)
   ├── /example              → Static demo portfolio (no signup needed)
   └── /admin                → CMS + live routing health

backend/ (Express · TypeScript · MongoDB · Mongoose)
   ├── agents/
   │   ├── runtime.ts            → Bounded ReAct loop (budget, repeat suppression, repair)
   │   ├── tools/repo.ts         → Read-only GitHub toolbelt + citation ledger
   │   └── repo-eval/
   │       ├── investigator.ts   → Chooses what evidence to gather
   │       ├── specialists.ts    → Three parallel lenses
   │       ├── verifier.ts       → Claims vs. cited source
   │       ├── scoring.ts        → Confidence-weighted aggregation
   │       └── orchestrator.ts   → Wires the phases together
   ├── evals/                    → Baseline, metrics, harness (npm run eval)
   ├── llm/
   │   ├── router.ts             → Per-task chains, throttles, call tracing
   │   ├── routeSource.ts        → Health-aware reordering (Power-of-Two-Choices)
   │   └── providers/            → Google AI Studio, OpenRouter, Groq, Cerebras, Together
   ├── services/                 → path, eval, github, interview, quiz, originality
   ├── models/                   → User, Path, Evaluation, Credential, Resource, SiteConfig
   └── routes/                   → auth, paths, evaluations (SSE), portfolio, admin
```

### Model routing

No business logic names a model. Each logical task (`investigate_repo`,
`verify_claim`, `synthesize_review`, …) resolves to an ordered chain of
(provider, model) pairs, and the router walks it until one succeeds.

Two inputs decide the order, and they answer different questions:

- **The static chain** encodes *task fitness* — which models are actually good
  at this job, hand-ordered. A health endpoint cannot supply that.
- **The admin-service** supplies *current health* — which keys and models are
  rate-limited or failing right now, aggregated across every project drawing on
  the same free-tier pool.

Fitness picks the candidates; health reorders within them, using
Power-of-Two-Choices rather than strict best-first. Best-first is what makes
free tiers collapse: every instance computes the same ranking, floods the same
model, exhausts it, and moves as one to the next — using a parallel quota
serially. Sampling two from the healthy head and taking the better one spreads
the load without ever picking something bad.

Outcomes are reported back after each call, so the ranking self-heals for every
consumer rather than each process rediscovering the same dead key. When the
service is unreachable the chains run exactly as configured.

Swapping the entire model lineup is one file: `backend/src/llm/providers/registry.ts`.
Reordering per task needs no file at all — `/admin/providers`.

---

## Quick start

### Prerequisites

- Node.js 20+ (`nvm use 20`)
- MongoDB — local (`mongod`) or [Atlas free M0](https://www.mongodb.com/cloud/atlas/register)
- A Google AI Studio API key — [free](https://aistudio.google.com/apikey)

Optional: OpenRouter / Groq / Cerebras keys for a richer fallback chain, a
GitHub OAuth app for login, a GitHub PAT to raise the API rate limit for public
repository reads.

### Setup

```bash
# Backend
cd backend
cp .env.example .env
# Minimum: MONGODB_URI, JWT_SECRET, ADMIN_SECRET, GOOGLE_AI_API_KEY
npm install
npm run seed      # resource corpus + default routing chains
npm test          # 50 offline tests, no keys or database needed
npm run dev       # :4000

# Frontend (separate terminal)
cd frontend
cp .env.example .env.local
# Set GITHUB_CLIENT_ID/SECRET, NEXTAUTH_SECRET
# ADMIN_SECRET must match the backend's
npm install
npm run dev       # :3000
```

Open http://localhost:3000. The admin panel is at `/admin` — enter the
`ADMIN_SECRET` from the backend `.env`.

### Measuring it

```bash
cd backend
npm run eval                 # baseline vs. agent over the case set
npm run eval -- --pipeline agent --reference evals/grades.json
```

Writes a JSON record of every per-case number and a Markdown comparison table.
The shipped grades are provisional — see [EVALUATION.md](EVALUATION.md) before
citing any figure from it.

---

## Production notes

- TypeScript strict mode across both packages
- Helmet, CORS and rate limiting on the API
- Zod validation on every endpoint
- Pino structured logging; per-request error boundaries
- JWT auth; HMAC-signed credentials
- Evaluation runs in the background and streams over SSE — an agent run reading
  a dozen files does not fit in a request timeout
- Every LLM call is bounded by a timeout and falls through on failure
- Degrades on every optional dependency: no vector store, no admin-service, no
  Dependabot, no screenshots — each is absent rather than fatal
- SSR + revalidation on portfolios; canonical URLs, sitemap, robots, JSON-LD
- `llms.txt` / `llms-full.txt` for AI answer engines
- Generated OG/Twitter card, no binary asset to maintain

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
## License

MIT.
