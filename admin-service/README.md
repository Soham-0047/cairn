# Admin Service

Standalone control plane for API credentials, site config, and curated resources.
Designed to outlive any single product — host it once and point every personal
project at it as the source of truth for keys/config.

## Why it exists

Stop pasting API keys into every project's `.env`. Manage Google AI / OpenRouter /
Groq / OpenAI / Anthropic / image API / OAuth client secrets in one place. Rotate
without redeploying anything. Disable a key everywhere by flipping one switch.
See which keys are expiring, which are rate-limited, which are unused.

## Architecture

```
┌──────────────────────────────┐         ┌──────────────────────────────┐
│  admin-service/frontend      │ cookie  │  admin-service/backend       │
│  Next.js — admin UI          ├────────►│  Express — API + auth        │
│  port 3001                   │         │  port 4001                   │
└──────────────────────────────┘         │  ─ Google OAuth (browser)    │
                                         │  ─ Service token (consumers) │
                                         │  ─ AES-256-GCM secrets       │
                                         └──────────┬───────────────────┘
                                                    │ Bearer SERVICE_TOKEN
                              ┌─────────────────────┼─────────────────────┐
                              ▼                     ▼                     ▼
                       gamma backend       project-B backend      project-C backend
                       (admin-client       (admin-client          (admin-client
                        pulls + caches)     pulls + caches)        pulls + caches)
```

Two auth modes on the same backend:
- **Browser session** (Google OAuth + email allowlist) → full CRUD via the admin UI.
- **Service token** (`Authorization: Bearer ...`) → read-only `/public/*` endpoints
  that consumer projects use to fetch decrypted credentials, config, and resources.

## Endpoints (backend, port 4001)

### Admin (cookie-gated, browser)
```
POST   /auth/google/start          # redirect to Google
GET    /auth/google/callback       # OAuth callback → sets session cookie
GET    /auth/me                    # current admin info
POST   /auth/logout                # clears session

GET    /admin/credentials          # list (no plaintext)
POST   /admin/credentials          # create
PATCH  /admin/credentials/:id      # update label/priority/enabled
POST   /admin/credentials/:id/rotate   # replace secret
POST   /admin/credentials/:id/test     # probe with real generation call
DELETE /admin/credentials/:id
GET    /admin/credentials/catalog  # list of known services

GET    /admin/config               # site config singleton
PATCH  /admin/config               # partial update
POST   /admin/config/reset

GET    /admin/resources            # learning resources catalog
POST   /admin/resources            # upsert by URL
POST   /admin/resources/bulk
DELETE /admin/resources/:id
```

### Public (service-token-gated, consumer projects)
```
GET    /public/credentials?service=google   # returns decrypted keys for a service
GET    /public/config                       # full site config (no secrets)
GET    /public/resources                    # learning resources
```

The `/public/credentials` endpoint is the load-bearing one — consumer projects
hit it on boot + every TTL to refresh their in-memory credential cache. It is
the **only** path that ever returns plaintext keys, and it requires the service
token. Cache TTL is enforced by the consumer (gamma uses 60s).

## Local setup

```bash
cd admin-service/backend && npm install && cp .env.example .env  # fill in
cd ../frontend && npm install && cp .env.local.example .env.local
# from /admin-service:
npm run dev   # starts both
```

Then visit http://localhost:3001 — sign in with a Google account whose email is
in `ADMIN_EMAILS` on the backend.

## Wiring a consumer project (e.g. gamma)

Set these on the consumer:
```
ADMIN_SERVICE_URL=http://localhost:4001         # or your hosted URL
ADMIN_SERVICE_TOKEN=<same value as backend>
ADMIN_SERVICE_ENABLED=true                       # gate; off = use local env keys
```

Gamma's `admin-client.ts` pulls credentials/config from this service with a 60s
in-memory cache and falls back to local env vars if the service is unreachable
on boot — so dev still works without admin-service running.
