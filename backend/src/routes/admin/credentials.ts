import { Router } from "express";
import { z } from "zod";
import { ApiCredential } from "../../models/ApiCredential.js";
import { encryptSecret, decryptSecret } from "../../utils/crypto.js";
import { getCredentialStore } from "../../llm/credentialStore.js";
import { SERVICE_CATALOG } from "../../llm/providers/registry.js";
import { logger } from "../../utils/logger.js";

const router = Router();

/**
 * Admin endpoints for the API-credential vault.
 *
 * GET    /api/admin/credentials                — list (no plaintext)
 * POST   /api/admin/credentials                — create
 * PATCH  /api/admin/credentials/:id            — update label/priority/enabled/metadata
 * POST   /api/admin/credentials/:id/rotate     — replace the secret
 * POST   /api/admin/credentials/:id/test       — issue a tiny call to verify it works
 * DELETE /api/admin/credentials/:id            — delete
 *
 * Plaintext keys are never returned, only `keyHint` (last 4 chars). The vault
 * is generic; the same model serves LLM keys today and image / OAuth tokens
 * tomorrow.
 */

router.get("/catalog", (_req, res) => {
  res.json({ services: SERVICE_CATALOG });
});

router.get("/", async (_req, res) => {
  const docs = await ApiCredential.find({})
    .sort({ service: 1, priority: 1, createdAt: 1 })
    .lean();
  const sanitized = docs.map((d) => ({
    id: String(d._id),
    service: d.service,
    kind: d.kind,
    label: d.label,
    keyHint: d.keyHint,
    metadata: d.metadata || {},
    priority: d.priority,
    enabled: d.enabled,
    source: d.source,
    successCount: d.successCount || 0,
    failureCount: d.failureCount || 0,
    lastUsedAt: d.lastUsedAt,
    lastFailureAt: d.lastFailureAt,
    lastFailureReason: d.lastFailureReason,
    createdAt: d.createdAt,
  }));
  res.json({
    credentials: sanitized,
    store: getCredentialStore().snapshot(),
  });
});

const createSchema = z.object({
  service: z.string().min(1).max(64).transform((s) => s.trim().toLowerCase()),
  kind: z.enum(["llm", "image", "content", "embedding", "oauth", "storage", "other"]).default("llm"),
  label: z.string().min(1).max(120).transform((s) => s.trim()),
  apiKey: z.string().min(4).max(8192),
  metadata: z.record(z.unknown()).optional(),
  priority: z.number().int().min(1).max(10_000).default(100),
  enabled: z.boolean().default(true),
});

router.post("/", async (req, res) => {
  const parse = createSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  try {
    const enc = encryptSecret(parse.data.apiKey);
    const doc = await ApiCredential.create({
      service: parse.data.service,
      kind: parse.data.kind,
      label: parse.data.label,
      secret: enc,
      keyHint: parse.data.apiKey.slice(-4),
      metadata: parse.data.metadata || {},
      priority: parse.data.priority,
      enabled: parse.data.enabled,
      source: "admin",
    });
    await getCredentialStore().reload();
    res.json({ id: String(doc._id), ok: true });
  } catch (err) {
    logger.error({ err }, "credential create failed");
    res.status(500).json({ error: "Create failed" });
  }
});

const patchSchema = z.object({
  label: z.string().min(1).max(120).optional(),
  metadata: z.record(z.unknown()).optional(),
  priority: z.number().int().min(1).max(10_000).optional(),
  enabled: z.boolean().optional(),
  kind: z.enum(["llm", "image", "content", "embedding", "oauth", "storage", "other"]).optional(),
});

router.patch("/:id", async (req, res) => {
  const parse = patchSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  try {
    const updated = await ApiCredential.findByIdAndUpdate(
      req.params.id,
      { $set: parse.data },
      { new: true },
    ).lean();
    if (!updated) return res.status(404).json({ error: "Not found" });
    await getCredentialStore().reload();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

const rotateSchema = z.object({ apiKey: z.string().min(4).max(8192) });

router.post("/:id/rotate", async (req, res) => {
  const parse = rotateSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  try {
    const enc = encryptSecret(parse.data.apiKey);
    const updated = await ApiCredential.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          secret: enc,
          keyHint: parse.data.apiKey.slice(-4),
          failureCount: 0,
          lastFailureAt: null,
          lastFailureReason: "",
        },
      },
      { new: true },
    );
    if (!updated) return res.status(404).json({ error: "Not found" });
    await getCredentialStore().reload();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * Probe a credential with a real generation call (LLM services) so the green
 * checkmark actually means "generation works", not just "key can list models".
 * The old list-only probe gave false positives — keys with restricted scope
 * could pass /models but 401/403 on generateContent. Falls back to /models for
 * non-LLM services (image / oauth / etc) where a list probe is the right shape.
 */
router.post("/:id/test", async (req, res) => {
  try {
    const doc = await ApiCredential.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "Not found" });
    const key = decryptSecret(doc.secret as { ciphertext: string; iv: string; authTag: string });

    const start = Date.now();
    let ok = false;
    let detail = "";
    let status = 0;

    if (doc.service === "google") {
      const probeModel = "gemini-2.5-flash";
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${probeModel}:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: "ping" }] }],
            generationConfig: { maxOutputTokens: 4, temperature: 0 },
          }),
        },
      );
      status = r.status;
      ok = r.ok;
      if (!ok) detail = (await r.text()).slice(0, 300);
    } else if (doc.kind === "llm") {
      const baseURL =
        (doc.metadata as Record<string, unknown> | null | undefined)?.baseURL as string | undefined ||
        SERVICE_CATALOG.find((s) => s.service === doc.service)?.baseURL ||
        "";
      if (!baseURL) {
        return res.json({
          ok: false,
          status: 0,
          detail: `No baseURL known for service "${doc.service}". Add metadata.baseURL to test.`,
        });
      }
      const probeModel =
        ((doc.metadata as Record<string, unknown> | null | undefined)?.testModel as string | undefined) ||
        defaultProbeModel(doc.service);
      const r = await fetch(`${baseURL.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: probeModel,
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 4,
          temperature: 0,
        }),
      });
      status = r.status;
      ok = r.ok;
      if (!ok) detail = (await r.text()).slice(0, 300);
    } else {
      // Non-LLM credential (image / oauth / etc). Best-effort: hit /models if
      // a baseURL is configured; otherwise we can't probe blindly.
      const baseURL =
        (doc.metadata as Record<string, unknown> | null | undefined)?.baseURL as string | undefined ||
        SERVICE_CATALOG.find((s) => s.service === doc.service)?.baseURL ||
        "";
      if (!baseURL) {
        return res.json({
          ok: false,
          status: 0,
          detail: `No probe configured for service "${doc.service}" (kind=${doc.kind}).`,
        });
      }
      const r = await fetch(`${baseURL.replace(/\/$/, "")}/models`, {
        headers: { Authorization: `Bearer ${key}` },
      });
      status = r.status;
      ok = r.ok;
      if (!ok) detail = (await r.text()).slice(0, 300);
    }

    res.json({ ok, status, detail, latencyMs: Date.now() - start });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});

function defaultProbeModel(service: string): string {
  switch (service) {
    case "openrouter":
      return "google/gemma-3-4b-it:free";
    case "groq":
      return "gemma2-9b-it";
    case "cerebras":
      return "llama3.1-8b";
    case "together":
      return "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free";
    case "openai":
      return "gpt-4o-mini";
    case "anthropic":
      return "claude-haiku-4-5-20251001";
    default:
      return "gpt-3.5-turbo";
  }
}

router.delete("/:id", async (req, res) => {
  await ApiCredential.findByIdAndDelete(req.params.id);
  await getCredentialStore().reload();
  res.json({ ok: true });
});

export default router;
