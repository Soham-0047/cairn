Developers
Call one API from all your projects instead of wiring Gemini, OpenAI or Groq into each repo. This service hands your code the best healthy free model right now — with automatic failover across providers and keys, and zero redeploys when a key rotates.

Before — per project
One hardcoded Gemini key = one quota
Key rotates → redeploy every repo
A 429 just fails the request
Add a provider → code change everywhere
After — one call
All keys in this one dashboard
Add / rotate keys with zero redeploys
Rate-limited or down → auto-fails over
Free quota spread across every key & model
1 · Connection
Point your project at these two values.

Base URL (ADMIN_URL)
https://admin-w1i8.onrender.com
Copy
Service token (SERVICE_TOKEN)
••••••••e723
Reveal
Copy
Shared secret — anyone with it can call /public/*. Store it in your project's env, never commit it, and rotate it on the backend if it leaks.
Every /public/* request must send Authorization: Bearer <SERVICE_TOKEN>. The dashboard login is for humans only; your code uses the service token.
2 · Quick start
Recommended — the zero-dependency client gives you caching + failover for free.

TypeScript SDK
cURL
Raw fetch
Install · bash
Copy
# 1) Copy the zero-dependency client into your project (Node 18+)
cp admin-service/sdk/admin-client.ts src/lib/admin-client.ts

# 2) Add to your project's .env
ADMIN_URL=https://admin-w1i8.onrender.com
SERVICE_TOKEN=<paste your service token>
Use — one call, automatic failover · ts
Copy
import { createAdminClient } from "./admin-client";

// Create once, reuse everywhere.
export const admin = createAdminClient({
  baseURL: process.env.ADMIN_URL!,          // https://admin-w1i8.onrender.com
  serviceToken: process.env.SERVICE_TOKEN!,
});

// ── ONE call replaces per-project Gemini / OpenAI / Groq wiring ──
// Picks the best healthy FREE model, races fallbacks across keys/providers,
// and reports health back so the next caller is routed around any problem.
const answer = await admin.withModelFailover("llm", async (c, signal) => {
  const res = await fetch(`${c.baseURL}/chat/completions`, {
    method: "POST",
    signal,                                 // losing races abort cleanly
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${c.values.apiKey}`,
    },
    body: JSON.stringify({
      model: c.model,
      messages: [{ role: "user", content: "Say hi in one line." }],
    }),
  });
  if (!res.ok) throw new Error(`upstream ${res.status}`);
  const json = await res.json();
  return json.choices[0].message.content as string;
});
withModelFailover spreads the pick across comparable free models (Power-of-Two-Choices), races fallbacks across keys on failure, and reports outcomes so the router backs off bad models automatically.

3 · Beyond model routing
The same client also serves prompts, flags and config.

Prompts & flags · ts
Copy
// Versioned prompts — edit copy in the Prompts tab, no redeploys.
const system = await admin.renderPrompt("agent.system", { name: "Ada" });

// Feature flags — one fetch, then evaluated locally per user/plan.
if (await admin.isFlagEnabled("new_checkout", { userId, plan: "pro" })) {
  // …ship the new flow
}
4 · Endpoint reference
All under the service-token gate. Full guide: INTEGRATION.md.

Method	Path	Use for
GET	/public/providers/route-models?kind=llm&freeOnly=1&activeOnly=1	Ranked best free (provider, model) candidates — creds included
GET	/public/providers/models?kind=llm	Per-model health inventory (no secrets)
POST	/public/providers/:id/report	Report a call's outcome so routing self-heals
GET	/public/prompts/:key	Fetch a versioned prompt
GET	/public/flags	All feature flags (evaluate locally in the SDK)
GET	/public/config	Arbitrary site-config JSON blob
GET	/public/credentials/:id	Non-LLM API key (Unsplash, Resend, …) from the vault
