import { Router } from "express";
import { z } from "zod";
import { getRouter, LLMChainError, type TaskType, type ChainEntry } from "../../llm/router.js";
import { getCredentialStore } from "../../llm/credentialStore.js";

const router = Router();

router.get("/", (_req, res) => {
  const r = getRouter();
  res.json({
    providers: r.getProviderStatus(),
    chains: r.getAllChains(),
    throttle: r.getThrottleSnapshot(),
  });
});

const chainSchema = z.object({
  task: z.string(),
  chain: z.array(z.object({ provider: z.string(), model: z.string() })).min(1),
});

router.post("/chain", (req, res) => {
  const parse = chainSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  try {
    getRouter().setChain(parse.data.task as TaskType, parse.data.chain as ChainEntry[]);
    res.json({ ok: true, chain: getRouter().getChain(parse.data.task as TaskType) });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Invalid chain" });
  }
});

const testSchema = z.object({
  task: z.string(),
  prompt: z.string().min(2).max(2000),
});

router.post("/test", async (req, res) => {
  const parse = testSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  // Admin explicitly asked to retest — give every key/provider a fresh shot
  // rather than carrying over throttles from a stale or one-off failure.
  const r = getRouter();
  const store = getCredentialStore();
  await store.reload();
  const chain = r.getChain(parse.data.task as TaskType);
  const seen = new Set<string>();
  for (const e of chain) {
    if (seen.has(e.provider)) continue;
    seen.add(e.provider);
    r.clearThrottle(e.provider);
    store.clearThrottles(e.provider);
  }
  try {
    const { response, trace } = await r.call(parse.data.task as TaskType, {
      messages: [{ role: "user", content: parse.data.prompt }],
      temperature: 0.3,
      maxTokens: 512,
    });
    res.json({
      output: response.raw,
      latencyMs: response.latencyMs,
      provider: response.provider,
      model: response.model,
      trace,
    });
  } catch (err) {
    const trace = err instanceof LLMChainError ? err.trace : null;
    res.status(502).json({
      error: err instanceof Error ? err.message : "Test failed",
      trace,
    });
  }
});

/**
 * Clear in-memory throttles so the admin can retry after a transient failure
 * without restarting the backend or waiting out the 1-hour 401/403 lockout.
 * Pass `{ provider: "google" }` to target one provider, or no body to clear all.
 */
const resetSchema = z.object({ provider: z.string().optional() });
router.post("/reset-throttles", (req, res) => {
  const parse = resetSchema.safeParse(req.body || {});
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  const r = getRouter();
  const store = getCredentialStore();
  const provider = parse.data.provider;
  const routerCleared = r.clearThrottle(provider);
  const credCleared = store.clearThrottles(provider);
  res.json({ ok: true, routerCleared, credCleared, provider: provider || "*" });
});

export default router;
