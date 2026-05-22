# DEV Submission — copy/paste fields

This file mirrors the DEV.to submission form for the Build With Gemma 4 prompt. Drop these into the corresponding fields after deploying.

## Title

**Cairn — AI learning + career engine, intentionally powered by three Gemma 4 variants**

## Cover image

Use any portfolio screenshot, or render the `/example` page in 1200x630 OG format.

## Submission Body (Markdown)

### What I built

Cairn turns the chaos of free internet tutorials into a personal 12-week path. A learner states their goal in plain English, and Gemma 4 builds them a path: phases, milestones with deliverables, curated free resources, and projects to build. As they ship those projects, Cairn pulls the GitHub repo, reads the code, and — if the user uploads screenshots — **looks at the running UI** to verify what the code claims. Verified projects become HMAC-signed credentials on a public, recruiter-shareable portfolio.

The product is a small but complete take on a real-world problem: India needs ~1M AI engineers by 2027 and has under 500K today; globally, AI-related job postings are up ~98% YoY. The bottleneck for self-taught learners is not access to content — it's **personalization, accountability, and provable proof-of-work**. Cairn delivers all three with Gemma 4 doing the work.

### Why three Gemma 4 variants?

| Task | Gemma 4 variant | Why this size |
|---|---|---|
| Goal parsing | **4B** | Sub-second structured extraction. The smallest tool that does the job. |
| Path generation | **27B** | Heavy reasoning across resource corpus + similar learners. The 128K context window matters. |
| Code review | **27B** | Reasoning over multi-file source code |
| **Multimodal visual review** | **12B (vision)** | The hero — native vision capability compares screenshots to code claims |

This is "intentional model selection" — the same judging criterion the challenge calls out. Every API call records which model actually ran; users see it on their evaluation page. When Google AI Studio rate-limits, the router falls back automatically to OpenRouter's free Gemma 4 endpoint, then to Gemini 2.5 Pro, then DeepSeek V3 — without the user noticing.

### Demo (most interesting part: multimodal eval)

1. Sign in with GitHub
2. Onboard: paste a free-form goal → Gemma 4 4B extracts your profile → Gemma 4 27B generates a 12-week path with the right resources for **you**
3. Build a project. Submit it at `/projects/new` with the repo URL **and screenshots of the running app**.
4. Watch the multi-stage pipeline: structural heuristics → Gemma 4 27B code review → **Gemma 4 12B vision compares the screenshots to what the code claims**
5. If you pass, you get a verified credential on `cairn.dev/u/your-handle`. Recruiters can open that URL.

### Tech depth

- **LLM router** with per-task fallback chains, throttle tracking, and provider-agnostic interface (Gemma 4 + Gemini + Groq + Cerebras + Together + OpenRouter, all OpenAI-chat-compatible or native Google API)
- **Multi-stage eval pipeline** with HMAC-signed credentials
- **CMS-style admin panel** — change brand, copy, colors, LLM routing, feature flags without redeploying
- **Production-ready**: typechecks, builds, helmet+CORS+rate-limit, structured logging, mobile-responsive

### Repo + Live demo

- GitHub: _(paste URL)_
- Live demo: _(paste URL)_
- Example portfolio (no signup): _(paste URL)/example_
- Walkthrough video: _(paste 2-min Loom)_

### What's next

Everything in `plan.md` not in v1 — daily coach nudges via WhatsApp, mock interview engine, job feed with per-job resume tailoring. The architecture is ready for them; v1 is intentionally scoped to demonstrate Gemma 4 capability over feature breadth.

---

## Tags
- gemma
- ai
- llm
- multimodal
- nextjs
- typescript

## Track
**Build With Gemma 4**

---

## Two-minute demo script

```
00:00  Hi, I'm Soham. This is Cairn — an AI learning + career engine that runs on Gemma 4.

00:08  Here's the problem: every self-taught dev in 2026 has unlimited free content, but no
       path, no accountability, and no way to prove their projects aren't tutorial clones.

00:20  I'll show you what Cairn does in 90 seconds.

00:25  [Onboarding] I tell Cairn my goal. A small Gemma 4 4B parses it into a structured
       profile in under a second. Then Gemma 4 27B generates this 12-week path —
       phases, milestones with concrete deliverables, curated free resources.

00:50  [Dashboard] Here's my path. Every milestone has a deliverable, not just "watch this."

01:00  [Multimodal eval — the hero] Now I submit a project. GitHub repo + screenshots.
       Watch what happens.
       Stage 1: structural heuristics — does this look like real work?
       Stage 2: Gemma 4 27B reads the code, evaluates originality, functionality, quality.
       Stage 3: Gemma 4 12B with VISION looks at my screenshots — does the UI match
       what the code claims?

01:30  Score: 86%. Verified credential issued. HMAC-signed. Tied to this exact repo.

01:40  [Portfolio] Here's my public portfolio. Recruiters can open this URL. Each project
       shows the score, the skills, AND which Gemma 4 model evaluated it. That last bit
       is transparency that "verified" actually means something.

01:55  Whole thing is one config file away from running on Llama or Qwen instead. Built
       for the Gemma 4 Challenge, designed to outlast it. Thanks.
```
