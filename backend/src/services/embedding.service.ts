import { createHash } from "crypto";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

const cache = new Map<string, number[]>();
const MAX_CACHE = 500;

function hashKey(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 32);
}

const EMBED_MODEL = "gemini-embedding-001";

/**
 * Get an embedding from Google `gemini-embedding-001` (current GA model).
 * Results are cached in-process by SHA-256(text) — paths don't change once written.
 * Throws if `GOOGLE_AI_API_KEY` is missing or the API call fails.
 */
export async function embedText(text: string): Promise<number[]> {
  if (!env.GOOGLE_AI_API_KEY) {
    throw new Error("GOOGLE_AI_API_KEY not configured");
  }
  const key = hashKey(text);
  const cached = cache.get(key);
  if (cached) return cached;

  const start = Date.now();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent?key=${env.GOOGLE_AI_API_KEY}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: `models/${EMBED_MODEL}`,
      content: { parts: [{ text }] },
      // Match the 768-dim Qdrant collection. gemini-embedding-001 defaults
      // to 3072; passing outputDimensionality keeps existing collections valid.
      outputDimensionality: 768,
    }),
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`Embedding API ${resp.status}: ${body.slice(0, 200)}`);
  }
  const data = (await resp.json()) as { embedding?: { values?: number[] } };
  const values = data.embedding?.values;
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error("Embedding API returned no values");
  }
  if (cache.size >= MAX_CACHE) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(key, values);
  logger.info(
    {
      model: EMBED_MODEL,
      inputLen: text.length,
      dims: values.length,
      latencyMs: Date.now() - start,
    },
    "Embedding generated",
  );
  return values;
}
