# Domains & DNS — How This Is Set Up

The runbook for `sohamdev.com`: what is wired where today, and the exact steps to
put a new or existing project on a subdomain — or to move the whole thing to a
different domain.

Companion doc: [Probable-domain-change.md](./Probable-domain-change.md) (the
*why* — registrar choice, cost, subdomains-vs-paths). This doc is the *how*.

---

## 1 · The stack in one line

**Cloudflare** owns the domain (registrar) and answers DNS.
**Netlify** hosts every site here and issues every SSL cert.
Cloudflare is **DNS-only** (grey cloud) — it is *not* proxying traffic.

Projects that live on **Vercel** work the same way — Cloudflare's side is
byte-for-byte identical, only the record target and two host behaviours change.
That is [§7](#7--playbook-d--the-same-thing-on-vercel).

| Layer | Who | Notes |
|---|---|---|
| Registrar | Cloudflare Registrar | at-cost, renewal = registration price |
| DNS | Cloudflare (`deb.ns` / `hasslo.ns.cloudflare.com`) | free, unlimited records |
| Hosting | Netlify (one site per project) — or Vercel, §7 | free tier |
| SSL | Host → Let's Encrypt, auto-renewed | nothing to manage |
| Email | Cloudflare Email Routing | forwards `@sohamdev.com` → Gmail |

**Why grey cloud, not orange.** The host — Netlify or Vercel — terminates TLS
with its own Let's Encrypt cert. Turning on Cloudflare's proxy puts a second TLS
layer in front of it, and until the host can complete an ACME HTTP challenge
through the proxy the cert provisioning fails — the classic "SSL handshake / too
many redirects" pair. Keep every record **DNS only**. You lose nothing: both
hosts are already a CDN.

---

## 2 · Live DNS records

| Name | Type | Value | Proxy | Serves |
|---|---|---|---|---|
| `sohamdev.com` | CNAME (flattened) | `sohamroy.netlify.app` | DNS only | Portfolio — studio hub at `/` |
| `www` | CNAME | `sohamroy.netlify.app` | DNS only | 301 → apex (Netlify does this) |
| `markvault` | CNAME | `markvault.netlify.app` | DNS only | MarkVault (the product) |
| `@` | MX ×3 | `route1/2/3.mx.cloudflare.net` | — | Cloudflare Email Routing |
| `@` | TXT | `v=spf1 include:_spf.mx.cloudflare.net ~all` | — | SPF |
| `cf2024-1._domainkey` | TXT | DKIM key | — | DKIM |

Cloudflare **flattens** the apex CNAME automatically (a bare `@` CNAME is
illegal in DNS; Cloudflare resolves it and serves the A records for you). That
is why `dig sohamdev.com` returns Netlify ALB IPs rather than a CNAME.

Not yet created — the remaining project subdomains (`culturesense`, `cairn`,
`bagichalink`, `delivervault`, `greencode`). They still point at their
`*.netlify.app` URLs, which is exactly what
[`useProjectSubdomains = false`](../src/content/site.mjs) in the repo encodes.

Verify any time:

```bash
dig +short NS sohamdev.com          # → *.ns.cloudflare.com
dig +short sohamdev.com             # → Netlify IPs
dig +short markvault.sohamdev.com   # → markvault.netlify.app.
curl -sI https://sohamdev.com | grep -i server   # → Netlify (no cf-ray = grey cloud)
```

---

## 3 · How the repo knows the domain

**One string moves the entire site.**
[`src/content/site.mjs`](../src/content/site.mjs) → `export const domain`.

Everything downstream is derived at build time:

```
domain ──► siteUrl ──┬─► canonical + OG + Twitter tags   (vite.config.mjs → injectSeo)
                     ├─► JSON-LD @graph                  (src/content/seo.js)
                     ├─► sitemap.xml + robots.txt        (emitCrawlerFiles — generated, never checked in)
                     ├─► /blog/** pages + rss.xml        (scripts/build-blog.mjs)
                     ├─► /freelance meta                 (renderFreelanceSeo)
                     └─► sub('markvault') → https://markvault.sohamdev.com
```

Three knobs, all in `site.mjs`:

| Knob | Effect |
|---|---|
| `domain` | the apex. Change it and every emitted URL follows. |
| `useProjectSubdomains` | `false` → projects link to `*.netlify.app`. `true` → all link to `<sub>.<domain>`. |
| `projectSites[key].subLive` | migrate **one** project early, ignoring the global flag. |

`VITE_SITE_URL` overrides `siteUrl` per deploy — Netlify sets it on branch
deploys and previews so a preview never emits a production canonical.

> Never hardcode a URL in a component. `routes`, `abs()`, `sub()` and
> `projectLinks()` in `site.mjs` exist so that a domain move is a one-line diff.

---

## 4 · Playbook A — new project on a new subdomain

Ten minutes, all free.

1. **Deploy it** to Netlify as its own site. Note the `<something>.netlify.app` URL.
2. **Netlify → Domain management → Add a domain** → `myproject.sohamdev.com`.
   Netlify will say the DNS doesn't point here yet. That's expected.
3. **Cloudflare → DNS → Add record**
   - Type `CNAME`, Name `myproject`, Target `<something>.netlify.app`
   - **Proxy status: DNS only (grey cloud)** ← the one setting people get wrong
   - TTL Auto
4. Wait 1–5 min. Netlify auto-provisions the Let's Encrypt cert (Domain
   management → HTTPS → "Verify DNS configuration" if impatient).
5. **Set it as the primary domain** in Netlify. This makes
   `<something>.netlify.app` 301 to it — which is what keeps any existing SEO
   equity instead of splitting it.
6. **Register it in the repo** — [`src/content/site.mjs`](../src/content/site.mjs):

   ```js
   myproject: {
     url: 'https://myproject.netlify.app',  // fallback while sub is not live
     sub: 'myproject',
     subLive: true,                          // ← flip when the CNAME resolves
     repo: 'MyProject',
   },
   ```

7. **Link it from the portfolio** (a card in `products.mjs` / `projects.js`).
   That link is Google's main discovery path to the subdomain.
8. Rebuild + deploy the portfolio so the sitemap picks up the new URL.

Confirm:

```bash
dig +short myproject.sohamdev.com                 # → myproject.netlify.app.
curl -sI https://myproject.sohamdev.com | head -3 # → HTTP/2 200, server: Netlify
```

---

## 5 · Playbook B — move an existing live project onto a subdomain

Same as A, but the SEO order matters because the project already has indexed URLs.

1. Add the custom domain in Netlify **and** the Cloudflare CNAME (steps 2–4 above).
2. Wait for the cert. Do **not** change anything in the app yet.
3. **Set the subdomain as primary in Netlify.** `*.netlify.app` now 301s to it —
   this is the redirect that carries the ranking over. Netlify does it for you;
   you do not write a redirect rule.
4. **Grep the project's own source** for the old host and update every hit —
   `robots.txt` `Sitemap:` line, `sitemap.xml`, canonical tags, OG `url`,
   hardcoded API/asset URLs, OAuth callback URLs, CORS allowlists.
   ```bash
   grep -rn "myproject.netlify.app" --exclude-dir=node_modules .
   ```
5. Flip `subLive: true` in `site.mjs`, rebuild the portfolio.
6. Google Search Console → resubmit the sitemap for the new host.

Step 4 is where this actually goes wrong. A stale `robots.txt` pointing at the
old sitemap, or a canonical still naming `*.netlify.app`, tells Google the new
domain is a duplicate of the old one — the exact opposite of the intent.

---

## 6 · Playbook C — move the portfolio to a whole new apex domain

1. Buy at Cloudflare Registrar (or transfer in). Nameservers are already
   Cloudflare's; nothing to change if you buy there.
2. Cloudflare DNS:
   - `@` CNAME → `sohamroy.netlify.app`, **DNS only** (Cloudflare flattens it)
   - `www` CNAME → `sohamroy.netlify.app`, **DNS only**
3. Netlify → Domain management → add **both** the apex and `www`, set the apex
   as **primary**. Netlify creates the `www` → apex 301 itself.
4. Wait for the cert to issue.
5. In [`src/content/site.mjs`](../src/content/site.mjs):
   ```js
   export const domain = 'newdomain.com'
   export const legacyDomains = ['sohamdev.com', 'sohamroy.netlify.app']
   ```
6. Keep the **old domain registered and pointed at the same Netlify site**, with
   the new one as primary — Netlify then 301s old → new permanently. Do not let
   the old domain lapse for at least a year; the redirect is what transfers
   authority.
7. Recreate every project subdomain CNAME under the new apex, then flip
   `useProjectSubdomains` / `subLive`.
8. Rebuild + deploy. Then Search Console:
   - add the new **Domain property** (DNS TXT verification)
   - use the **Change of Address** tool from the old property to the new
   - resubmit `https://newdomain.com/sitemap.xml`

`robots.txt` and `sitemap.xml` are *generated* from `domain` on every build —
that is deliberate. A checked-in static `robots.txt` silently kept a `Sitemap:`
line pointing at the old host every previous time the domain moved.

---

## 7 · Playbook D — the same thing on Vercel

Playbooks A–C assume Netlify because that is what the portfolio runs on. Some
projects deploy to Vercel instead. **Cloudflare's side of the work is
identical** — a grey-cloud record pointing at the host. Only the record's
*target* and two host behaviours differ.

| | Netlify | Vercel |
|---|---|---|
| Where you add the domain | Site → Domain management → Add a domain | Project → Settings → Domains → Add |
| Subdomain record | `CNAME` → `<site>.netlify.app` | `CNAME` → `cname.vercel-dns.com` |
| Apex record | `CNAME` → `<site>.netlify.app` (CF flattens) | `A` → the IP Vercel shows you, **or** `CNAME` → `cname.vercel-dns.com` (CF flattens) |
| Ownership proof | none — DNS resolving is the proof | sometimes a `_vercel` `TXT`, if the domain is already claimed elsewhere |
| Cert | Let's Encrypt, automatic | Let's Encrypt, automatic |
| Free-tier URL after you attach a domain | 301s to it once the domain is **primary** | **stays live and serving 200** — you fix this yourself |
| Proxy status in Cloudflare | DNS only | DNS only |

> **Take the values Vercel's Domains panel prints, not the ones in a blog post.**
> Vercel has changed its recommended apex IP over time (`76.76.21.21` →
> `216.198.79.1`), and the CNAME target can be region-suffixed for newer
> projects. The panel shows the pair that is correct for *your* project today.
> The apex `CNAME` route sidesteps the question entirely — Cloudflare flattens
> it, and you are never pinned to an IP that Vercel later rotates.

### D.1 — project on a subdomain

1. **Deploy it** to Vercel. Note the production `<project>.vercel.app` URL.
2. **Vercel → Project → Settings → Domains → Add** → `myproject.sohamdev.com`.
   When it offers *"Use Vercel's nameservers"*, **decline it** — see the gotcha
   in §10. Choose the *add a record at your DNS provider* path.
3. **Cloudflare → DNS → Add record**
   - Type `CNAME`, Name `myproject`, Target `cname.vercel-dns.com`
   - **Proxy status: DNS only (grey cloud)**
   - TTL Auto
4. If Vercel asks for a `TXT` at `_vercel`, add that too — same zone, also DNS
   only. It disappears from the requirements once verification passes.
5. Wait 1–5 min. Vercel flips the domain to **Valid Configuration** and issues
   the cert on its own.
6. **Redirect the `*.vercel.app` URL yourself.** This is the step that has no
   Netlify equivalent and the one that gets skipped. Check it first:

   ```bash
   curl -sI https://myproject.vercel.app | head -1   # 200 = two indexable copies
   ```

   If it is `200`, add to the project's `vercel.json`:

   ```json
   {
     "redirects": [
       {
         "source": "/:path*",
         "has": [{ "type": "host", "value": "myproject.vercel.app" }],
         "destination": "https://myproject.sohamdev.com/:path*",
         "permanent": true
       }
     ]
   }
   ```

   Redeploy. `permanent: true` emits a 308, which passes ranking signals the
   same way a 301 does. Without this you have shipped the exact duplicate-content
   split that §5 warns about — Netlify just happens to prevent it for you.

7. **Set the canonical host per environment.** In Vercel → Settings →
   Environment Variables, set `VITE_SITE_URL` (or whatever the project reads)
   to the real domain for **Production** only, and to the preview URL for
   **Preview**. `VERCEL_URL` is the per-deployment hostname and changes every
   push — it is never a canonical.
8. From here it is identical to Playbook A: register the project in
   [`src/content/site.mjs`](../src/content/site.mjs), link it from the
   portfolio, rebuild.

### D.2 — apex + `www` on Vercel

Same as §6, with the record targets swapped:

- `@` → `CNAME` `cname.vercel-dns.com`, **DNS only** (Cloudflare flattens), or
  the `A` record Vercel prints.
- `www` → `CNAME` `cname.vercel-dns.com`, **DNS only**.
- Add **both** in Vercel. It asks which is primary and creates the 308 from the
  other; do not also write that redirect in `vercel.json`, or you get the loop
  described in §10.

### D.3 — close-out checklist (either host)

The DNS record is the easy half. These are the steps that decide whether the
move actually counts, and they are the same on Netlify and Vercel:

- [ ] `dig` resolves the name to the host, and `curl -sI` returns `200` over
      **https** with no cert warning.
- [ ] The free-tier URL (`*.netlify.app` / `*.vercel.app`) returns a **permanent
      redirect** to the custom domain, not `200`. Netlify: promote the domain to
      primary. Vercel: the `vercel.json` rule above.
- [ ] Grep the project's own source for the old host and fix every hit —
      canonical tags, OG `url`, `robots.txt`'s `Sitemap:` line, `sitemap.xml`,
      hardcoded API/asset URLs, **OAuth callback URLs**, **CORS allowlists**.
      ```bash
      grep -rn "myproject.vercel.app\|myproject.netlify.app" --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=dist .
      ```
- [ ] Firebase/Auth0/Supabase → add the new domain to **Authorized domains**.
      Sign-in breaks silently on the new host otherwise.
- [ ] `site.mjs`: entry added, `subLive: true`, portfolio rebuilt and deployed
      so `sitemap.xml` carries the new URL.
- [ ] A link to it exists from the portfolio — that is Google's discovery path.
- [ ] Search Console: **nothing to do.** The Domain property on `sohamdev.com`
      already covers every subdomain (§8). Just resubmit the portfolio sitemap.
- [ ] No leftover `noindex` header or `Disallow: /` from a staging build.

Confirm:

```bash
dig +short myproject.sohamdev.com                  # → cname.vercel-dns.com. → IPs
curl -sI https://myproject.sohamdev.com | head -1  # → HTTP/2 200
curl -sI https://myproject.sohamdev.com | grep -i '^server'   # → Vercel / Netlify
curl -sI https://myproject.vercel.app  | head -1   # → HTTP/2 308  (NOT 200)
```

A `cf-ray` header in any of those replies means the record is orange-clouded.
Go back and grey it.

---

## 8 · Search Console & indexing

- Verify with the **Domain property** option (DNS TXT record in Cloudflare), not
  URL-prefix. One verification then covers the apex **and every current and
  future subdomain** — you never verify a subdomain again.
- `VITE_GOOGLE_SITE_VERIFICATION` / `VITE_BING_SITE_VERIFICATION` (Netlify env
  vars) inject the HTML-tag verification meta; empty = no tag emitted. The DNS
  method is preferred, so these are usually unset.
- Every subdomain needs its **own** title, description and OG image. Shipping a
  host's placeholder metadata is the most common reason a project subdomain
  ranks for nothing.
- Check for a stray `noindex` or a blocking `robots.txt` carried over from a
  staging build before pointing a real domain at anything.

---

## 9 · Netlify routing on the portfolio itself

[`netlify.toml`](../netlify.toml) — order matters, **first match wins**, and
every explicit rule must sit above the `/*` SPA catch-all:

| From | To | Why |
|---|---|---|
| `/freelance` | `/freelance/index.html` | no-trailing-slash URL for the static sub-site |
| `/portfolio` | `/portfolio/index.html` | the React SPA (moved off `/` by `build-hub.mjs`) |
| `/blog`, `/blog/:slug` | `/blog/**/index.html` | serve the pre-rendered article, not the empty SPA shell |
| `/*` | `/index.html` | SPA fallback — non-forced, so real files win |

The blog rules are the load-bearing ones: without them a crawler falls through
to the catch-all and gets a JS shell, which undoes the entire static-rendering
pipeline.

---

## 10 · Gotchas

- **Grey cloud, always.** Proxied (orange) records break cert issuance on both
  Netlify and Vercel. If you ever do turn the proxy on deliberately, Cloudflare's
  SSL mode must be **Full (strict)** — anything less is a redirect loop.
- **Never point the nameservers at the host.** Both Netlify and Vercel offer to
  run DNS for you, and both offers are wrong here: the zone also holds the
  Cloudflare Email Routing `MX`, `SPF` and `DKIM` records, so moving it silently
  kills `@sohamdev.com` mail. Always take the *add a record at your existing
  provider* path.
- **Primary domain in Netlify is the SEO switch.** It is what generates the
  301 from `*.netlify.app`. Adding a custom domain without promoting it to
  primary leaves two live, competing copies of the site.
- **Vercel has no such switch.** `*.vercel.app` keeps serving `200` after you
  attach a custom domain. The redirect is yours to write — see §7.6.
- **Don't hand-write a `www` → apex redirect.** Netlify and Vercel both already
  do it once both names are attached; a second one produces a redirect loop.
- **The contact function's route is a literal.**
  `netlify/functions/contact.mjs` → `export const config = { path: ... }` is read
  by Netlify's bundler at deploy time, so it cannot import from `site.mjs`.
  `routes.api.contact` is what callers read; keep the two in sync by hand.
- **DNS propagation is minutes, not days**, on Cloudflare. If a record looks
  wrong after 10 minutes, it *is* wrong — re-check the record, don't wait.
- **Cost stays flat**: ~$10–12/yr for the domain. DNS, WHOIS privacy, SSL,
  unlimited subdomains and Search Console are all free.

---

## 11 · Publishing from MarkVault (`/api/republish`)

Pressing **Publish** in MarkVault writes a document to the `public_posts`
Firestore collection. On its own that changes nothing anyone can see: `/blog`
is static HTML generated at build time, and it keeps serving yesterday's set
of posts until the site is rebuilt.

`/api/republish` is what connects the write to the build.

```
MarkVault [Publish]
   │  writes public_posts/<slug>
   │  POST /api/republish   +  Firebase ID token
   ▼
netlify/functions/republish.mjs
   │  verifies the token against Google's JWKS, checks uid == owner
   │  POST → Netlify build hook          (hook URL never leaves the server)
   ▼
npm run build → scripts/build-blog.mjs
   │  re-reads the whole public_posts collection over the REST API
   ▼
https://sohamdev.com/blog/<slug>/        ~60s after the button
```

### Why a function and not the build hook directly

A Netlify build hook URL is a bearer credential — anyone holding the string
can trigger unlimited builds. MarkVault is a client-side app, so a hook URL in
its source is a hook URL in everyone's DevTools.

A shared secret header fails the same way one layer down: it would also be in
the client bundle. Moving a public string behind a second public string is not
authentication.

So the gate is the identity MarkVault already has. It sends the signed
**Firebase ID token** of the signed-in user; the function verifies the RS256
signature against Google's published keys and checks `sub` equals the owner
UID. That is the same check `firestore.rules` already makes on `public_posts`,
so there is one answer on this domain to "who may publish".

### Setting it up

**1 · Netlify → Build & deploy → Build hooks** — create one, e.g. "MarkVault
publish". Copy the URL.

**2 · Netlify → Environment variables:**

| Variable | Value |
|---|---|
| `NETLIFY_BUILD_HOOK` | the hook URL from step 1 |
| `PUBLISH_OWNER_UID` | your Firebase UID — the same literal that is in `firestore.rules` |
| `PUBLISH_ALLOWED_ORIGINS` | comma-separated origins MarkVault is served from |
| `VITE_FIREBASE_PROJECT_ID` | already set; the token's `aud` is checked against it |

**3 · In MarkVault**, after the Firestore write succeeds:

```js
const token = await firebase.auth().currentUser.getIdToken()
await fetch('https://sohamdev.com/api/republish', {
  method: 'POST',
  headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
  body: JSON.stringify({ slug }),
})
// → 202 { ok: true, slug, eta: 60 }
```

**4 · Verify:** `npm run test:publish` exercises every rejection path against a
real signature check. Then publish something and watch Netlify's deploy log —
the build is titled `publish: <slug>`.

### Responses

| Status | Meaning |
|---|---|
| `202` | build started; `eta` is a typical cold build, not a promise |
| `401` | missing, malformed, expired, forged, or wrong-project token |
| `403` | valid token, but not the owner UID |
| `405` | not a POST |
| `500` | the function's env vars are not set on Netlify |
| `502` | Netlify refused the build hook |

### Gotchas

- **The route is a literal.** `export const config = { path: '/api/republish' }`
  is read by Netlify's bundler at deploy time, so it cannot import from
  `site.mjs`. `routes.api.republish` is what callers read — keep them in sync
  by hand, exactly as with `/api/contact`.
- **Two publishes in a row do not need debouncing.** Netlify cancels the older
  queued build on the same branch itself, and a stateless function could not
  implement a debounce honestly anyway.
- **CORS is not the gate.** A valid owner token sent from `curl` will build,
  and that is correct — the origin allowlist only decides whether a *browser*
  may read the reply. The token is the authorisation.
- **A missing env var returns a vague 500 to the caller** and a specific line
  to the deploy log. A misconfigured deploy should not tell a stranger which
  variable is missing.

---

## 12 · The machine-readable surface

Three files and one convention make the articles citable by assistants rather
than merely crawlable by search engines. All are generated — none is a static
file in `public/` — so their URLs track `domain` in `site.mjs` like everything
else.

| URL | Generated by | Served as |
|---|---|---|
| `/llms.txt` | `scripts/lib/corpus.mjs` | `text/plain` |
| `/llms-full.txt` | same | `text/plain` |
| `/blog/<slug>/index.md` | same | `text/markdown` |
| `/blog/feed.json` | same | `application/feed+json` |
| `/images/og/<slug>.jpg` | `scripts/shoot-og.mjs` | committed asset |

**The Content-Type headers in `netlify.toml` are load-bearing.** Without them
Netlify serves `.md` and `.txt` as `application/octet-stream`, a browser
downloads the file instead of showing it, and several fetching agents discard
it outright. The whole point of publishing these is that they can be read.
`Access-Control-Allow-Origin: *` is set on all of them on purpose — a
browser-based agent reading cross-origin would otherwise be blocked.

### robots.txt names AI agents individually

`robotsTxt()` in `src/content/seo.js` lists ~20 assistant crawlers and allows
each. Two reasons it is explicit rather than left to `User-agent: *`:

1. Several of them decide whether this site appears as a **citation** in an
   answer someone gets from ChatGPT, Claude or Perplexity.
2. Some are separated by **purpose**, and confusing them is costly:
   `Google-Extended` and `Applebot-Extended` govern model training, while
   Googlebot and Applebot govern search. Blocking a training token does not
   remove you from search — and blocking the wrong one does.

To opt out of one later, change its `Allow` to `Disallow` **in `seo.js`**.
Adding a static `robots.txt` to `public/` will not work: the generated file
wins, and the static one is silently ignored.

### Share cards and the MarkVault gap

`npm run og` renders each post's card with headless Chrome, running the real
`terrain.js` shader so the card matches the article's hero. Output is
committed, because **Netlify's build image has no Chrome**.

The consequence is a real, bounded gap: a post published from MarkVault is live
in ~60 seconds with a correct title, description and URL in its unfurl, but the
site's default image, until you run `npm run og` and push. Nothing breaks; the
card just improves on the next deploy. If that ever becomes unacceptable, the
fix is an on-demand renderer (satori + resvg behind `/api/og`), which is two
dependencies and a native binary in a function bundle — deliberately not taken
for a one-image-per-post problem.
