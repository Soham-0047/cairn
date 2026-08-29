# Cairn — portfolio site entry

Everything the `sohamdev.com` portfolio repo needs to list Cairn. Follows
Playbook A, steps 6–8 of the domains runbook.

---

## 1 · `src/content/site.mjs`

Add to `projectSites`:

```js
cairn: {
  url: 'https://cairn.sohamdev.com',
  sub: 'cairn',
  subLive: true,
  repo: 'cairn',
},
```

`subLive: true` because the CNAME resolves and the domain is attached. Leave
`useProjectSubdomains` as it is — the per-project flag is enough.

---

## 2 · Product / project card

```js
{
  key: 'cairn',
  name: 'Cairn',
  tagline: 'AI learning paths with verified projects',
  description:
    "Turns the internet's chaos of free tutorials into a personalized 12-week " +
    'learning path, reviews the projects you ship with AI — reading both the code ' +
    'and screenshots of the running app — and issues signed credentials that build ' +
    'a recruiter-ready portfolio.',
  tags: ['Next.js', 'TypeScript', 'Express', 'MongoDB', 'Gemma 4', 'Qdrant'],
  status: 'live',
  href: 'https://cairn.sohamdev.com',
  repo: 'https://github.com/Soham-0047/cairn',
},
```

---

## 3 · Copy blocks

Reuse whichever fits the card size. These match the metadata the app itself
emits, so the portfolio and the product tell search engines the same story.

**One line (≤ 60 chars)**
> AI learning paths with verified projects

**Short (≤ 160 chars — meta-description length)**
> Get a personalized 12-week learning path, ship real projects, and earn
> AI-verified credentials for your portfolio.

**Long (card body)**
> Cairn builds a free, personalized 12-week learning path from the best free
> tutorials on the internet, reviews the projects you ship with AI (code +
> screenshots), and issues signed credentials that assemble into a
> recruiter-ready portfolio. Free to start, no course to buy.

**What makes it interesting (technical blurb)**
> Three Gemma 4 variants behind one provider-agnostic router: a 4B for
> sub-second goal parsing, a 27B for path generation and code review, and a 12B
> vision model that looks at screenshots of the running app and checks them
> against what the code claims. Every task has an automatic fallback chain, so a
> throttled free tier degrades quality instead of breaking the product.

---

## 4 · Links to include

| Label | URL |
|---|---|
| Live | `https://cairn.sohamdev.com` |
| Example portfolio | `https://cairn.sohamdev.com/example` |
| Source | `https://github.com/Soham-0047/cairn` |

Point the "see it working" link at **`/example`** — it is a complete portfolio
with no signup, so it is the strongest single link for a visitor who will not
create an account.

---

## 5 · Why the link matters

A link from the portfolio is **Google's main discovery path to a new
subdomain**. Nothing else points at `cairn.sohamdev.com` yet, so until the card
ships and the portfolio is redeployed, the subdomain is effectively orphaned —
its sitemap exists but nothing links in.

After adding the card:

1. Rebuild and deploy the portfolio so `sitemap.xml` picks up the URL.
2. Search Console — **nothing to verify.** The Domain property on `sohamdev.com`
   already covers every subdomain. Just submit
   `https://cairn.sohamdev.com/sitemap.xml`.
