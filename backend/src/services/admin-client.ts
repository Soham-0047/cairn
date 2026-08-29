import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

/**
 * Client for the standalone admin-service.
 *
 * The service holds every provider key in one place and, more usefully, tracks
 * per-(provider, model) health from outcomes reported by all its consumers. It
 * answers one question well: *which free model should this call use right now*.
 *
 * That is strictly better information than this process has on its own. A
 * local throttle table only knows about failures this instance has already
 * suffered; the service knows about failures every project sharing the pool has
 * suffered, so a key exhausted by another consumer is routed around here before
 * the first 429 is ever seen locally.
 *
 * Everything degrades: when the service is unreachable, callers fall back to
 * the static chains in llm/router.ts and the local credential vault. A stale
 * cache is preferred over an empty one, because a slightly out-of-date ranking
 * still routes better than no ranking at all.
 */

export type RouteCandidate = {
  /** Credential id — quote this back when reporting the call's outcome. */
  id: string;
  provider: string;
  model: string;
  apiKey: string;
  baseURL?: string;
  /** Service-side health score, 0-1. Higher is healthier. */
  health: number;
  /** Lower sorts first. */
  priority: number;
  metadata: Record<string, unknown>;
};

export type ModelHealth = {
  provider: string;
  model: string;
  health: number;
  rpmRemaining?: number;
  lastFailureAt?: string;
  disabled?: boolean;
};

type CacheEntry<T> = { value: T; expiresAt: number };

const ttlMs = () => env.ADMIN_SERVICE_TTL_SEC * 1000;

const routeCache = new Map<string, CacheEntry<RouteCandidate[]>>();
const inflight = new Map<string, Promise<RouteCandidate[]>>();
let flagsCache: CacheEntry<Record<string, unknown>> | null = null;
let configCache: CacheEntry<unknown> | null = null;
const promptCache = new Map<string, CacheEntry<string>>();

export function isEnabled(): boolean {
  return !!env.ADMIN_SERVICE_ENABLED && !!env.ADMIN_SERVICE_URL && !!env.ADMIN_SERVICE_TOKEN;
}

function url(path: string): string {
  return `${env.ADMIN_SERVICE_URL.replace(/\/$/, "")}${path}`;
}

async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const ctl = new AbortController();
  // The admin-service sits in the hot path of every LLM call. If it is slow,
  // routing must fall back rather than add its latency to the user's request.
  const timer = setTimeout(() => ctl.abort(), 4_000);
  try {
    return await fetch(url(path), {
      ...init,
      signal: ctl.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.ADMIN_SERVICE_TOKEN}`,
        ...(init.headers || {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

/* ----------------------------- route models ----------------------------- */

/**
 * Ranked (provider, model, key) candidates for a kind of work, healthiest
 * first, with credentials attached.
 */
export async function fetchRouteCandidates(
  kind: "llm" | "vision" | "embedding" = "llm",
  opts: { freeOnly?: boolean; activeOnly?: boolean; force?: boolean } = {},
): Promise<RouteCandidate[]> {
  if (!isEnabled()) return [];
  const freeOnly = opts.freeOnly !== false;
  const activeOnly = opts.activeOnly !== false;
  const key = `${kind}:${freeOnly}:${activeOnly}`;

  const cached = routeCache.get(key);
  if (!opts.force && cached && cached.expiresAt > Date.now()) return cached.value;

  const existing = inflight.get(key);
  if (existing) return existing;

  const p = (async () => {
    try {
      const qs = new URLSearchParams({ kind });
      if (freeOnly) qs.set("freeOnly", "1");
      if (activeOnly) qs.set("activeOnly", "1");
      const r = await authedFetch(`/public/providers/route-models?${qs}`);
      if (!r.ok) throw new Error(`route-models → ${r.status}`);
      const json = (await r.json()) as unknown;
      const candidates = normalizeCandidates(json);
      routeCache.set(key, { value: candidates, expiresAt: Date.now() + ttlMs() });
      logger.info({ kind, candidates: candidates.length }, "admin-client: refreshed route candidates");
      return candidates;
    } catch (err) {
      logger.warn(
        { kind, err: (err as Error).message },
        "admin-client: route refresh failed; serving stale candidates",
      );
      return routeCache.get(key)?.value ?? [];
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, p);
  return p;
}

/** Per-model health inventory. No secrets — safe to surface in the admin UI. */
export async function fetchModelHealth(kind: "llm" | "vision" | "embedding" = "llm"): Promise<ModelHealth[]> {
  if (!isEnabled()) return [];
  try {
    const r = await authedFetch(`/public/providers/models?kind=${kind}`);
    if (!r.ok) throw new Error(`models → ${r.status}`);
    const json = (await r.json()) as unknown;
    const rows = Array.isArray(json) ? json : ((json as Record<string, unknown>)?.models as unknown[]) || [];
    return rows
      .filter((m): m is Record<string, unknown> => !!m && typeof m === "object")
      .map((m) => ({
        provider: String(m.provider ?? ""),
        model: String(m.model ?? m.modelId ?? ""),
        health: numOr(m.health, 1),
        rpmRemaining: typeof m.rpmRemaining === "number" ? m.rpmRemaining : undefined,
        lastFailureAt: typeof m.lastFailureAt === "string" ? m.lastFailureAt : undefined,
        disabled: m.disabled === true,
      }))
      .filter((m) => m.provider && m.model);
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "admin-client: model health fetch failed");
    return [];
  }
}

/**
 * Report a call's outcome so the service's ranking self-heals.
 *
 * Fire-and-forget by design: this runs after the user already has their answer,
 * and a telemetry write must never add latency to, or fail, a successful call.
 */
export function reportOutcome(
  credentialId: string,
  outcome: { ok: boolean; model?: string; status?: number; latencyMs?: number; reason?: string },
): void {
  if (!isEnabled() || !credentialId) return;
  authedFetch(`/public/providers/${encodeURIComponent(credentialId)}/report`, {
    method: "POST",
    body: JSON.stringify({
      ok: outcome.ok,
      model: outcome.model,
      status: outcome.status,
      latencyMs: outcome.latencyMs,
      reason: (outcome.reason || "").slice(0, 300),
      at: new Date().toISOString(),
    }),
  }).catch(() => {
    /* telemetry only */
  });
}

/* -------------------------- prompts, flags, config -------------------------- */

/** A versioned prompt, editable without a redeploy. Falls back to `fallback`. */
export async function fetchPrompt(key: string, fallback: string): Promise<string> {
  if (!isEnabled()) return fallback;
  const cached = promptCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  try {
    const r = await authedFetch(`/public/prompts/${encodeURIComponent(key)}`);
    if (!r.ok) throw new Error(`prompts/${key} → ${r.status}`);
    const json = (await r.json()) as Record<string, unknown>;
    const body = typeof json.body === "string" ? json.body : typeof json.text === "string" ? json.text : "";
    if (!body) throw new Error("empty prompt body");
    promptCache.set(key, { value: body, expiresAt: Date.now() + ttlMs() });
    return body;
  } catch (err) {
    logger.debug({ key, err: (err as Error).message }, "admin-client: prompt fetch failed; using in-code default");
    return cached?.value ?? fallback;
  }
}

export async function fetchFlags(): Promise<Record<string, unknown>> {
  if (!isEnabled()) return {};
  if (flagsCache && flagsCache.expiresAt > Date.now()) return flagsCache.value;
  try {
    const r = await authedFetch("/public/flags");
    if (!r.ok) throw new Error(`flags → ${r.status}`);
    const json = (await r.json()) as Record<string, unknown>;
    const value = (json.flags as Record<string, unknown>) ?? json;
    flagsCache = { value, expiresAt: Date.now() + ttlMs() };
    return value;
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "admin-client: flag fetch failed");
    return flagsCache?.value ?? {};
  }
}

export async function isFlagEnabled(name: string, fallback = false): Promise<boolean> {
  const flags = await fetchFlags();
  const v = flags[name];
  if (v === undefined || v === null) return fallback;
  if (typeof v === "boolean") return v;
  if (typeof v === "object") return (v as Record<string, unknown>).enabled === true;
  return v === "true" || v === 1 || v === "1";
}

export async function fetchSiteConfig<T = unknown>(force = false): Promise<T | null> {
  if (!isEnabled()) return null;
  if (!force && configCache && configCache.expiresAt > Date.now()) return configCache.value as T;
  try {
    const r = await authedFetch(
      `/public/config?key=${encodeURIComponent(env.ADMIN_SERVICE_PRODUCT_KEY)}`,
    );
    if (!r.ok) throw new Error(`config → ${r.status}`);
    const json = await r.json();
    configCache = { value: json, expiresAt: Date.now() + ttlMs() };
    return json as T;
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "admin-client: site-config fetch failed");
    return (configCache?.value as T) ?? null;
  }
}

/** A single non-LLM API key from the vault (Unsplash, Resend, …). */
export async function fetchCredential(id: string): Promise<string | null> {
  if (!isEnabled()) return null;
  try {
    const r = await authedFetch(`/public/credentials/${encodeURIComponent(id)}`);
    if (!r.ok) throw new Error(`credentials/${id} → ${r.status}`);
    const json = (await r.json()) as Record<string, unknown>;
    const key = json.key ?? json.apiKey ?? (json.values as Record<string, unknown>)?.apiKey;
    return typeof key === "string" ? key : null;
  } catch (err) {
    logger.warn({ id, err: (err as Error).message }, "admin-client: credential fetch failed");
    return null;
  }
}

export async function ping(): Promise<{ ok: boolean; detail?: string }> {
  if (!isEnabled()) return { ok: false, detail: "disabled" };
  try {
    const r = await authedFetch("/public/providers/models?kind=llm");
    if (!r.ok) return { ok: false, detail: `status ${r.status}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, detail: (err as Error).message };
  }
}

/* -------------------------------- shaping -------------------------------- */

/**
 * The service has shipped more than one response shape for route-models
 * (a bare array, `{candidates}`, `{models}`), and credentials have appeared
 * both flattened and nested under `values`. Normalising here means a change on
 * that side degrades to "fewer candidates" rather than a crash in the router.
 */
function normalizeCandidates(json: unknown): RouteCandidate[] {
  const rows: unknown[] = Array.isArray(json)
    ? json
    : (((json as Record<string, unknown>)?.candidates as unknown[]) ??
       ((json as Record<string, unknown>)?.models as unknown[]) ??
       ((json as Record<string, unknown>)?.routes as unknown[]) ??
       []);

  return rows
    .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
    .map((r) => {
      const values = (r.values as Record<string, unknown>) || {};
      const apiKey = pickString(r.apiKey, r.key, values.apiKey, values.key);
      return {
        id: pickString(r.id, r.credentialId, r._id),
        provider: pickString(r.provider, r.service).toLowerCase(),
        model: pickString(r.model, r.modelId),
        apiKey,
        baseURL: pickString(r.baseURL, r.baseUrl, values.baseURL, values.baseUrl) || undefined,
        health: numOr(r.health ?? r.score, 1),
        priority: numOr(r.priority, 100),
        metadata: (r.metadata as Record<string, unknown>) || {},
      };
    })
    .filter((c) => c.provider && c.model && c.apiKey);
}

function pickString(...vals: unknown[]): string {
  for (const v of vals) if (typeof v === "string" && v.trim()) return v.trim();
  return "";
}

function numOr(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}
